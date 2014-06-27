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
function check() {
  // todo: セッションチェック
  // todo: アクセス権限チェック

}

exports.getSignedUrl = function (params, callback) {

  // todo: チェック
  check();

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

function getIndex(info, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      db.collection(collection_name).findOne({
        _id: new ObjectID(info.Key)
      }, function (err, result) {
        db.close();
        callback(err, result);
      });
    }
  });
}

exports.addIndex = function (params, info, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      db.collection(collection_name).insert({
        _id: new ObjectID(info.Key),
        filename: params.filename,
        length: params.length,
        uploadDate: new Date(),
        contentType: info.ContentType
//        bucket: params.Bucket,
      }, function (err, result) {
        db.close();
        callback(err, result);
      });
    }
  });
}

exports.del = function (params, callback) {
  var values = {deleted_at: new Date()};
  this.putIndex(params.id, values, callback);
}

exports.put = function (params, body, callback) {
  var values = {};

  checkbox(values, 'direct', body['direct']);

  checkbox(values, 'cache.public', body['public']);
  checkbox(values, 'cache.private', body['private']);
  checkbox(values, 'cache.no_cache', body['no_cache']);
  checkbox(values, 'cache.no_store', body['no_store']);
  checkbox(values, 'cache.no_transform', body['no_transform']);
  checkbox(values, 'cache.proxy_revalidate', body['proxy_revalidate']);
  checkbox(values, 'cache.must_revalidate', body['must_revalidate']);
  checkbox(values, 'cache.max_age', body['max_age']);

  this.putIndex(params.id, values, function (err, result) {
    callback(err, result);
  });

  // MongoDB → S3
  this.reverseUpdateMetaInfo(params.id, function (err, result) {
  });

};

function checkbox(values, name, value) {
  if (value !== undefined) {
    values[name] = (value === 'true') ? true : false;
  }
}

exports.putIndex = function (_id, values, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      var con = {_id: new ObjectID(_id)};
      var set = {$set: values};
      db.collection(collection_name).findAndModify(con, [], set, function (err, result) {
        db.close();
        callback(err, result);
      });
    }
  });
};


exports.get = function (req, res) {
  var key = req.params.id;

  // todo: チェック
  check();

  var info = {Bucket: Bucket, Key: key};
  getIndex(info, function (err, index) {

    if (index.direct) {
      // ローカル配送
      var ims = req.headers['if-modified-since'];
      var uld = index.uploadDate;

      var forbidden = Math.ceil(((new Date()).getTime() / 30000));

      console.log('timestamp : ' + forbidden);
      console.log('if-modified-since : ' + ims);
      console.log('');

      var moment_ims = moment(ims).unix();
      var moment_uld = moment(uld).unix();

      if (ims && uld && moment_uld == moment_ims) {
        res.removeHeader('Cache-Control');
        res.send(304); // Not Modified.
      } else {
        send_direct(info, res, index, function (err, result) {
        });
      }
    } else {
      //CloudFront配送
      getSignedURL2({host: cf_files, key: key}, function (err, result) {
        if (err) {
          res.send(err);
        } else {
          redirect(res, result.url);
        }
      });
    }
  });
};

exports.list = function (params, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      var collection = db.collection(collection_name);
      var condition = {deleted_at: {$exists: false}};
      collection.find(condition).count(function (err, iTotalRecords) {
        if (params.sSearch) {
          condition['$or'] = [
            {filename: new RegExp(params.sSearch)},
            {contentType: new RegExp(params.sSearch)}
          ]
        }
        collection.find(condition).count(function (err, iTotalDisplayRecords) {
          var sort = [];
          if (params.iSortCol_0) {
            sort.push([params['mDataProp_' + params.iSortCol_0], params.sSortDir_0]);
          }
          var option = {
            sort: sort,
            limit: params.iDisplayLength,
            skip: params.iDisplayStart
          };
          collection.find(condition, option).toArray(function (err, results) {
            db.close();
            callback(null, {
              items: results,
              iTotalRecords: iTotalRecords,
              iTotalDisplayRecords: iTotalDisplayRecords
            });
          });
        });
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

/**
 * S3オブジェクトを送信する
 * @param params {Bucket: xxx, Key: xxx}
 * @param res
 * @param maxAge キャッシュ有効期間(sec)
 * @param callback
 */
exports.send_direct = function (params, res, index, callback) {
  var s3 = new AWS.S3();
  s3.getObject(params, function (err, data) {
    if (err) {
      res.send(err);
    } else {
      var header = {'Content-Type': data.ContentType};
      if (index) {
        //header['Cache-Control'] = cache_control(index.cache);
        if (index.uploadDate) {
          // UTCで返すこと
          header['Last-Modified'] = index.uploadDate.toUTCString();
        }
      }
      res.writeHead(200, header);
      res.write(data.Body);
      res.end();
    }
    callback(err, data);
  });
};

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
