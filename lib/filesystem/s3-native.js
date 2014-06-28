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

var AWS = require('aws-sdk');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
function S3(name) {
  var bucket = [process.env.AWS_BUCKET, name].join('.');
  bucket = bucket.toLowerCase();
  bucket = bucket.replace('_', '.');
  this.Bucket = bucket;
}

function open(bucket, key) {
  return new AWS.S3({params: {Bucket: bucket, Key: key}});
}

/**
 * バケット作成
 *
 * @param callback
 */
S3.prototype.createBucket = function (callback) {
  var s3 = open(this.Bucket);
  s3.createBucket({}, function (err, data) {
    if (err) {
      callback(err);
    } else {
      putBucketCors(params.Bucket, function (err) {
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
  var s3 = open(this.Bucket);
  s3.deleteBucket({}, function (err, data) {
    callback(err, data);
  });
};

/**
 * 読み込み
 *
 * @param id
 * @param callback
 */
S3.prototype.read = function (id, callback) {
  var s3 = open(this.Bucket, id);
  var params = {};
  s3.getObject(params, function (err, data) {
    callback(err, data);
  });
};

/**
 * 読み込み (ReadStream)
 *
 * http://aws.typepad.com/aws_japan/2013/05/aws-sdk-for-nodejs-now-generally-available.html
 */
S3.prototype.createReadStream = function (id) {
  return open(this.Bucket, id).getObject().createReadStream();
};

/**
 * 書き込み
 *
 * body : new Buffer('...') || 'STRING_VALUE' || streamObject
 *
 * @param callback
 */
S3.prototype.write = function (id, body, type, callback) {
  var s3 = open(this.Bucket, id);
  var params = {Body: body, ContentType: type};
  s3.putObject(params, function (err, data) {
    callback(err, data);
  });
};

/**
 * 削除
 *
 * @param callback
 */
S3.prototype.delete = function (id, callback) {
  var s3 = open(this.Bucket, id);
  s3.deleteObject(function (err, data) {
    callback(err, data);
  });
};

/**
 * メタデータ 読み込み
 *
 * @param id
 * @param callback
 */
S3.prototype.getInfo = function (id, callback) {
  var s3 = open(this.Bucket, id);
  var params = {};
  s3.headObject(params, function (err, data) {
    callback(err, data);
  });
};

/**
 * CORS設定
 *
 * @param bucket
 * @param callback
 */
function putBucketCors(bucket, callback) {
  var s3 = open(bucket);
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
};


module.exports = S3;
