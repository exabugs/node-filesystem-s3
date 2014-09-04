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
  Base.call(this, db, name || 'S3Index'); // call super constructor
  this.s3 = new S3(this.name);
  this.fields = DB.extend(fields, this.fields);
  return this;
});

/**
 *
 * @param _id
 * @param format
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
  //var key = _id.toString().split("").reverse().join("");

  // リバースしないで_idをそのまま使っていいだろう。2014/09/01 sakurai
  var key = _id.toString();

  return format ? [format, key].join('/') : key;
}

/**
 * 検索
 *
 * @param context
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
 * 更新
 *
 * @param context
 * @param params
 * @param callback
 */
S3Index.prototype.before_update = function (context, params, callback) {
  /*
   var self = this;
   S3_Action.before_upsert.call(self, context, params, 'update', callback);
   */
  var self = this;
  S3Index.prototype.super_.before_update.call(self, context, params, function (err, params) {
    self.s3_write(context, params, callback);
  });
};

S3Index.prototype.after_update = function (context, params, object, callback) {
  var self = this;
  S3Index.prototype.super_.after_update.call(this, context, params, object, function (err, object) {
    self.s3_thumbnail(context, object, callback);
  });
};

/**
 * 新規
 *
 * @param context
 * @param params
 * @param callback
 */
S3Index.prototype.before_create = function (context, params, callback) {
  var self = this;
  S3Index.prototype.super_.before_create.call(self, context, params, function (err, params) {
    self.s3_write(context, params, callback);
  });
};

S3Index.prototype.after_create = function (context, params, object, callback) {
  var self = this;
  S3Index.prototype.super_.after_create.call(self, context, params, object, function (err, object) {
    self.s3_thumbnail(context, object, callback);
  });
};

/*
 var S3_Action = {

 before_upsert: function (context, params, method, callback) {

 var self = this;

 async.waterfall([
 function (next) {
 S3Index.prototype.super_["before_" + method].call(self, context, params, function (err, params) {
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
 }
 */
/*
 ,

 after_upsert: function (context, params, object, method, callback) {

 var self = this;

 S3Index.prototype.super_["after_" + method].call(self, context, params, object, function (err, object) {
 // サムネイルの生成
 var format = self.resize_format;
 var type = object.contentType;
 if (format && type && type.indexOf('image/') === 0) {
 process.nextTick(function () {
 var key = objectId_to_S3key(object._id, context.format);
 self.s3.resize(key, format, function (err) {
 err && console.log(err);
 });
 });
 }
 callback(err, object);
 })
 }
 */


/**
 *
 * @param context
 * @param params
 * @param object
 * @param callback
 *
 * resize_format = [
 *   { ext: 'small',  width: 64,  height: 64  },
 *   { ext: 'medium', width: 256, height: 256 }
 * ];
 *
 */

S3Index.prototype.resize_format = [
//  { ext: 'small', width: 64, height: 64  },
//  { ext: 'medium', width: 256, height: 256 }
];


/**
 *
 * @param params
 * @param next
 */
S3Index.prototype.s3_write = function (context, params, callback) {
  var self = this;
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
      delete params.values.body;
      callback(err, params);
    })
  } else {
    callback(null, params);
  }
};

/*
 ],
 function (err, params) {
 delete params.values.body;
 callback(err, params);
 }
 )
 */


/**
 * サムネイルの生成
 *
 * @param context
 * @param object
 * @param callback
 */
S3Index.prototype.s3_thumbnail = function (context, object, callback) {
  var self = this;
  var format = self.resize_format;
  var type = object.contentType;
  if (format && type && type.indexOf('image/') === 0) {
    process.nextTick(function () {
      var key = objectId_to_S3key(object._id, context.format);
      self.s3.resize(key, format, function (err) {
        err && console.log(err);
      });
    });
  }
  callback(null, object);
};

/**
 * S3から取得
 * 対象オブジェクトを取得するためのSignedURLを生成する
 *
 * @param context
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
 * @param context
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
