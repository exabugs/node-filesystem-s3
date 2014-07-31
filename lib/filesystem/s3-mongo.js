//"use strict";

var async = require('async');
var ObjectID = require('mongodb').ObjectID;
var S3 = require('./s3-native');
var DB = require('../db');
var Base = require('../base').ParanoiaBase;

/**
 * フィールド定義
 */
var fields = {
  'contentType': { type: 'String' },
  'filename': { type: 'String' },
  'length': { type: 'Number' },
  'uploadDate': { type: 'Date' }
};

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var S3Index = DB.inherits(Base, function (db, name) {
  this.class = 'S3Index';
  this.name = name || this.class;
  this.s3 = new S3(this.name);
    Base.call(this, db, this.name); // call super constructor
    this.fields = DB.extend(fields, this.fields);
  return this;
});

/**
 *
 * @param _id
 * @returns {string}
 */
function objectId_to_S3key(_id, format) {
  // S3はキーの先頭3桁を使って物理ディスクを決定(分散)している
  // ObjectIDの先頭は時刻情報のため分散しない。
  // 故に、ObjectIDを反転させてS3のキーとする。
  // [ObjectID]
  //  "_id" : ObjectId("53b21cf4ea1307bc2183dce0")
  //   4バイトの，Unixエポックからの経過秒数(Unix時間)
  //   3バイトのマシンID
  //   2バイトのプロセスID
  //   3バイトのカウンタ(開始番号はランダム)
  var key = _id.toString().split("").reverse().join("");

  return format ? [format, key].join('/') : key;
}

/**
 * 検索
 * @param params
 *   fields:
 *        body: 内容をストリームで取得する場合
 * @param object
 * @param callback
 */
S3Index.prototype.after_findOne = function (context, params, object, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        // call super method
        S3Index.prototype.super_.after_findOne.call(self, context, params, object, function (err, object) {
          next(err, object);
        });
      },
      function (object, next) {
        if (params.fields && params.fields.body) {
          var key = objectId_to_S3key(object._id, context.format);
          self.s3.createReadStream(key, function (err, stream, data) {
            if (!err) {
              object.body = stream;
              object.length = data.ContentLength;
            }
            next(err, object);
          });
        } else {
          next(null, object);
        }
      }
    ],
    function (err, object) {
      callback(err, object);
    }
  )
};

/**
 * 保存(S3への保存)
 * @param params
 * @param callback
 */
S3Index.prototype.before_update = function (context, params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        // call super method
        S3Index.prototype.super_.before_update.call(self, context, params, function (err, params) {
          next(err, params);
        });
      },
      function (params, next) {
        params.query._id = params.query._id || new ObjectID();
        var values = params.values || {};
        if (values.body) {
          var key = objectId_to_S3key(params.query._id, context.format);
          var body = values.body;
          var type = values.contentType;
          var name = values.filename;
          self.s3.write(key, body, type, name, function (err, info) {
            if (!err) {
              values.length = Number(info.ContentLength);
              values.uploadDate = new Date(Date.parse(info.LastModified));
            }
            next(err, params);
          })
        } else {
          next(null, params);
        }
      }
    ],
    function (err, params) {
      delete params.values.body;
      callback(err, params);
    }
  )
};

/**
 *
 * @param context
 * @param params
 * @param object
 * @param callback
 *
 * resize_format = [
 *   {ext: 'small',  width: 100, height: 100},
 *   {ext: 'midium', width: 200, height: 200}
 * ];
 *
 */
S3Index.prototype.after_update = function (context, params, object, callback) {
  var self = this;
  // call super method
  S3Index.prototype.super_.after_update.call(self, context, params, object, function (err, params) {
    // サムネイルの生成
    var format = self.resize_format;
    var type = object.contentType;
    if (format && type && type.indexOf('image/') === 0) {
      process.nextTick(function () {
        var key = objectId_to_S3key(object._id, context.format);
        self.s3.resize(key, format, function (err) {
          console.log('');
        });
      });
    }
    callback(err, object);
  });
};

/**
 * S3から取得
 * 対象オブジェクトを取得するためのSignedURLを生成する
 *
 * @param _id
 * @param callback
 */
S3Index.prototype.s3_download = function (context, _id, callback) {
  var key = objectId_to_S3key(_id, context.format);
  this.s3.getSignedUrl(key, function (err, url) {
    callback(err, url);
  });
};

/**
 * S3から削除
 * 通常はS3は追加専用で使用する
 * テストで使用したデータ等を直接削除する場合に使用する
 *
 * @param _id
 * @param callback
 */
S3Index.prototype.s3_delete = function (context, _id, callback) {
  var key = objectId_to_S3key(_id, context.format);
  this.s3.destroy(key, function (err, data) {
    callback(err, data);
  });
};

module.exports = S3Index;
