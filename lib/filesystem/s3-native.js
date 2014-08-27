/*
 // アプリの初期化時にAmazon認証。バケットの名前空間(ユーザ別)を決定。
 // 使う時にバケット名の後半部分(ユーザに依存しない。アプリで決定) を指定する。
 // バケット名の後半部分は、MongoDBの

 //[ユーザ別 環境変数]
 // [AWS必須]
 //   AWS_ACCESS_KEY_ID     : (20桁)
 //   AWS_SECRET_ACCESS_KEY : (40桁)
 //   AWS_REGION            : ap-northeast-1
 // [アプリ必須]
 //   AWS_BUCKET

 // 移行手順
 // 1. ストレージをS3に変更
 //   無限の容量 → ディスク容量の拡張作業が要らなくなる。
 // 2. アップロード/ダウンロードのリダイレクト
 //   無限のコネクション → インスタンス数を減らせる。
 */

"use strict";

var os = require('os');
var fs = require('fs');
var path = require('path');
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm');
var url = require('url');
var crypto = require('crypto');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
function S3(name) {
  this.name = name;
  this.bucket = process.env.AWS_BUCKET.toLowerCase().replace('_', '.');
  process.env.AWS_CF_CERT &&
  (this.cert = fs.readFileSync(process.env.AWS_CF_CERT));
}

S3.prototype.pathname = function (key) {
  return ['S3', this.name, key].join('/');
};

S3.prototype.open = function (key) {
  return new AWS.S3({params: {Bucket: this.bucket, Key: this.pathname(key)}});
};

/**
 * バケット作成
 *
 * @param callback
 */
S3.prototype.createBucket = function (callback) {
  var s3 = this.open();
  s3.createBucket({}, function (err, data) {
    if (err) {
      callback(err);
    } else {
      putBucketCors(params.bucket, function (err) {
        callback(err, data);
      });
    }
  });
};

/**
 * バケット削除
 *
 * @param callback
 */
S3.prototype.deleteBucket = function (callback) {
  var s3 = this.open();
  s3.deleteBucket({}, function (err, data) {
    callback(err, data);
  });
};

/**
 * 読み込み
 *
 * @param key
 * @param callback
 */
S3.prototype.read = function (key, callback) {
  var s3 = this.open(key);
  var params = {};
  s3.getObject(params, function (err, data) {
    callback(err, data);
  });
};

/**
 * 読み込み (ReadStream)
 *
 * http://aws.typepad.com/aws_japan/2013/05/aws-sdk-for-nodejs-now-generally-available.html
 *
 * @param key
 * @param callback
 */
S3.prototype.createReadStream = function (key, callback) {
  var s3 = this.open(key);
  s3.headObject({}, function (err, data) {
    if (err) {
      callback(err);
    } else {
      callback(null, s3.getObject().createReadStream(), data);
    }
  });
};

/**
 * 書き込み
 *
 * @param key
 * @param body    new Buffer('...') || 'STRING_VALUE' || streamObject
 * @param type
 * @param name
 * @param callback
 */
S3.prototype.write = function (key, body, type, name, callback) {
  var s3 = this.open(key);
  var params = {Body: body, ContentType: type};
  name && (params['ContentDisposition'] = 'inline; filename="' + encodeURIComponent(name) + '"');
  s3.putObject(params, function (err, data) {
    if (err) {
      callback(err);
    } else {
      s3.headObject({}, function (err, data) {
        callback(err, data);
      });
    }
  });
};

/**
 * 削除
 *
 * @param key
 * @param callback
 */
S3.prototype.destroy = function (key, callback) {
  var s3 = this.open(key);
  s3.deleteObject(function (err, data) {
    callback(err, data);
  });
};

/**
 * メタデータ 読み込み
 *
 * @param key
 * @param callback
 */
S3.prototype.getInfo = function (key, callback) {
  var s3 = this.open(key);
  var params = {};
  s3.headObject(params, function (err, data) {
    callback(err, data);
  });
};

/**
 * リダイレクトURL(ダウンロード)取得
 *
 * @param key
 * @param callback
 */
S3.prototype.getSignedUrl = function (key, callback) {
  var env = process.env;
  if (this.cert && env.AWS_CF_KEY && env.AWS_CF_HOST) {
    // CloufFrontリダイレクト
    var info = {
      host: process.env.AWS_CF_HOST,
      protocol: 'http',
      pathname: this.pathname(key)
    };
    var resource = url.format(info);
    var expires = Math.ceil((new Date()).getTime() / 1000) + 3;  // epoch-expiration-time
    var policy = {
      'Statement': [
        {
          'Resource': resource,
          'Condition': {'DateLessThan': {'AWS:EpochTime': expires}}
        }
      ]
    };
    var sign = crypto.createSign('RSA-SHA1');
    sign.update(JSON.stringify(policy));
    var signature = sign.sign(this.cert.toString('ascii'), 'base64');
    var params = [
        'Key-Pair-Id=' + process.env.AWS_CF_KEY,
        'Expires=' + expires,
        'Signature=' + signature
    ];
    callback(null, resource + "?" + params.join('&'));
  } else {
    // S3リダイレクト
    var s3 = this.open(key);
    var params = {
      Expires: 3 // seconds, default 900 seconds
    };
    s3.getSignedUrl('getObject', params, function (err, url) {
      callback(err, url);
    });
  }
};

/**
 * 画像リサイズ
 *
 * (Mac) ImageMagick インストール方法
 *  $ brew reinstall imagemagick
 *  $ brew link --overwrite imagemagick
 *
 * @param key
 * @param params = { small: { width: 100, height: 100 } }
 * @param callback
 */
S3.prototype.resize = function (key, params, callback) {
  var self = this;

  var so0 = self.open(key);
  so0.headObject({}, function (err, data) {
    async.each(Object.keys(params), function (ext, next) {
      var param = params[ext];
      var rs0 = so0.getObject().createReadStream();
      var file = path.join(os.tmpDir(), "tmp_" + [key, ext].join('.'));
      gm(rs0).options({imageMagick: true}).resize(param.width, param.height).write(file, function (err) {
        var so1 = self.open([ext, key].join('/'));
        var rs1 = fs.createReadStream(file);
        var params = {Body: rs1, ContentType: data.ContentType};
        so1.putObject(params, function (err) {
          if (err) {
            console.log(err);
            next(err);
          } else {
            console.log('put success');
            fs.unlink(file, function (err) {
              err && console.log(err);
              next(err);
            });
          }
        });
      });
    }, function (err) {
      callback(err, data);
    });

  });
};

/**
 * CORS設定
 *
 * @param bucket
 * @param callback
 */
function putBucketCors(bucket, callback) {
  var s3 = this.open();
  var params = {
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
          AllowedOrigins: ['*'],
          //ExposeHeaders: ['STRING_VALUE'],
          MaxAgeSeconds: 600
        }
      ]
    }
    //,ContentMD5: 'STRING_VALUE'
  };
  s3.putBucketCors(params, function (err, data) {
    callback(err, data);
  });
}


module.exports = S3;
