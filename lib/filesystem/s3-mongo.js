"use strict";

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
  if (!this.initialized[this.class]) {
    this.super_.constructor(db, this.name);
    this.fields = DB.extend(fields, this.fields);
    this.initialized[this.class] = true;
  }
  return this;
});

/**
 *
 * @param _id
 * @returns {string}
 */
function objectId_to_S3key(_id) {
  // S3はキーの先頭3桁を使って物理ディスクを決定(分散)している
  // ObjectIDの先頭は時刻情報のため分散しない。
  // 故に、ObjectIDを反転させてS3のキーとする。
  // [ObjectID]
  //  "_id" : ObjectId("53b21cf4ea1307bc2183dce0")
  //   4バイトの，Unixエポックからの経過秒数(Unix時間)
  //   3バイトのマシンID
  //   2バイトのプロセスID
  //   3バイトのカウンタ(開始番号はランダム)
  return _id.toString().split("").reverse().join("");
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
        self.super_.after_findOne(context, params, object, function (err, object) {
          next(err, object);
        });
      },
      function (object, next) {
        if (params.fields && params.fields.body) {
          var key = objectId_to_S3key(object._id);
          object.body = self.s3.createReadStream(key);
        }
        next(null, object);
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
        self.super_.before_update(context, params, function (err, params) {
          next(err, params);
        });
      },
      function (params, next) {
        params.query._id = params.query._id || new ObjectID();
        var values = params.values || {};
        if (values.body) {
          var key = objectId_to_S3key(params.query._id);
          var body = values.body;
          var type = values.contentType;
          self.s3.write(key, body, type, function (err, info) {
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
 * 削除
 * @param params
 * @param callback
 */

/*
 S3Index.prototype.after_destroy = function (params, object, callback) {
 callback(null, params, object);
 };
 */

/**
 *
 * @param _id
 * @param callback
 */
S3Index.prototype.getSignedUrl = function (context, _id, callback) {
  var key = objectId_to_S3key(_id);
  context.format && (key = [key, context.format].join('.'));
  this.s3.getSignedUrl(key, function (err, url) {
    callback(err, url);
  });
};

module.exports = S3Index;
