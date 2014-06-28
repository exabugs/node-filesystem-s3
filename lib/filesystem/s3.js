/*
 * Apple HLS ドキュメント
 * https://developer.apple.com/jp/devcenter/ios/library/documentation/StreamingMediaGuide.pdf
 */

"use strict";

var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var urlParse = require('url');

var AWS = require('aws-sdk');
var moment = require('moment');
var mongodb = require('mongodb');

var ObjectID = mongodb.ObjectID;
var DB = require('../db/index');


var Bucket = 'dreamarts-cloud-doo-test201407';

var cloudfrontAccessKey = 'APKAJXAWARLRTMLFEN5Q';
var cf_movie = 'd1kv693yr8tzlv.cloudfront.net';
var cf_files = 'd3ofoq5rnvboqg.cloudfront.net';

var privateKey = process.env.AWS_CF_CERT;

var collection_name = 'files';



/**
 * 署名付きURL(アップロード用)
 *
 * ex.
 * curl  -X PUT -H 'Content-Type: image/png' -v --upload-file popy150.png "https://hoge.s3.amazonaws.com/....."
 *
 * expires       : null or seconds      (default) 1 seconds
 * content_type  : null or <type>       (default) binary/octet-stream
 * key           : null or ObjectID     (default) new Key
 * method        : 'GET' or 'PUT'       (default) PUT
 */
// getUploadUrl
// getDownloadUrl
S3.prototype.getSignedUrl = function (params, callback) {

  var info = {
    Bucket: params.bucket || Bucket,
    Expires: Number(params.expires) || 2, // (default) 2 seconds
    Key: params.key || (new ObjectID()).toString()
  };
  var method = 'getObject';
  if ('PUT' === params.method) {
    method = 'putObject';
    info.ContentType = params.contentType;

    this.addIndex(params, info, function (err, index) {
      if (err) {
        callback(err);
      } else {
        _getSignedUrl(method, info, callback);
      }
    });
  } else {


    this.getSignedURL2({host: cf_files, key: info.Key}, function (err, result) {
      callback(err, result);
    });


  }
}

function _getSignedUrl(method, info, callback) {
  var s3 = new AWS.S3();
  // todo: 公開ファイルならsignしない。signがなければキャッシュが有効になる。
  s3.getSignedUrl(method, info, function (err, url) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        url: url,
        method: method,
        bucket: info.Bucket,
        key: info.Key,
        expires: info.Expires,
        contentType: info.ContentType
      });
    }
  });
}


/**
 * 後処理
 *
 * ETagなどのメタ情報をS3から取得して保管する
 * 動画の場合はエンコードジョブの投入
 *
 * id : ObjectID
 */
exports.aftertreat = function (params, callback) {

  var Key = params.id;

  // S3 → MongoDB
  updateMetaInfo(Key, callback);

};

exports.updateMetaInfo = function (key, callback) {
  // 情報取得 S3 → MongoDB
  // ETag
  // LastModified
  // ContentLength
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      var params = {Bucket: Bucket, Key: key};
      var s3 = new AWS.S3();
      s3.headObject(params, function (err, data) {
        if (err) {
          res.send(err);
        } else {
          var con = {_id: new ObjectID(params.Key)};
          var set = {$set: {
            //etag: data.ETag.replace(/["]/g,''),
            contentType: data.ContentType,
            uploadDate: (new moment(data.LastModified)).toDate(),
            length: Number(data.ContentLength)
          }};
          db.collection(collection_name).findAndModify(con, [], set, function (err, result) {
            db.close();
            callback(err, result);
          });
        }
      });
    }
  });
};

exports.update_test = function (_id, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      var con = {_id: new ObjectID(_id)};
      var values = {
        uploadDate: new Date()
      };
      var set = {$set: values};
      db.collection(collection_name).findAndModify(con, [], set, function (err, result) {
        db.close();
        callback(err, result);
      });
    }
  });
};

function reverseUpdateMetaInfo(key, callback) {
  // 情報設定 MongoDB → S3
  // CacheーControll
  getIndex({Key: key}, function (err, index) {
    if (err) {
      callback(err);
    } else {
      var cache = cache_control(index.cache);
      var params = {Bucket: Bucket, Key: key};
      var s3 = new AWS.S3();
      // 既存オブジェクトの更新ができないので自分自身にコピー
      s3.headObject(params, function (err, data) {
        params.CopySource = [Bucket, key].join('/');
        params.Metadata = data.Metadata;
        params.MetadataDirective = 'REPLACE';
        params.ContentType = data.ContentType;
        params.CacheControl = cache;
        s3.copyObject(params, function (err, result) {
          callback(err, result);
        });
      });
    }
  });
}



exports.getSignedURL2 = function (params, callback) {

  var url_info = {
    host: params.host,
    protocol: 'http',
    pathname: params.key
  };
  var url = urlParse.format(url_info);

  var expiration = moment().add('seconds', 2).unix();  // epoch-expiration-time

  var policy = {
    'Statement': [
      {
        'Resource': url,
        'Condition': {
          'DateLessThan': {'AWS:EpochTime': expiration}
        }
      }
    ]
  };

  fs.readFile(privateKey, function (err, pem) {

    var sign = crypto.createSign('RSA-SHA1')
      , key = pem.toString('ascii')

    sign.update(JSON.stringify(policy))
    var signature = sign.sign(key, 'base64')

    // Finally, you build the URL with all of the required query params:

    var params = [
        'Key-Pair-Id=' + cloudfrontAccessKey,
        'Expires=' + expiration,
        'Signature=' + signature
    ];

    callback(null, {url: url + "?" + params.join('&')});
  });
};

function redirect(res, url) {
  res.removeHeader('Cache-Control');
  res.redirect(url);
}

module.exports = router;
