"use strict";

var async = require('async');
var moment = require('moment');
var S3 = require('./s3-native');
var DB = require('../db');
var Base = require('../base').ParanoiaBase;
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var S3Index = DB.extend(Base, function (name) {
  this.__super__.constructor(name);
  this.s3 = new S3(name);
});

function objectId_to_S3key(_id) {
  // S3はキーの先頭3桁を使って物理ディスクを決定(分散)している
  // ObjectIDの先頭は時刻情報のため分散しない。
  // 故に、ObjectIDを反転させてS3のキーとする。
  // [ObjectID]
  //   4バイトの，Unixエポックからの経過秒数(Unix時間)
  //   3バイトのマシンID
  //   2バイトのプロセスID
  //   3バイトのカウンタ(開始番号はランダム)
  return _id.toString().split("").reverse().join("");
}

/**
 * 保存(S3への保存)
 * @param params
 * @param callback
 */
S3Index.prototype.before_update = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.__super__.before_update(params, function (err, params) {
          next(err, params);
        });
      },
      function (params, next) {
        params._id = params._id || new ObjectID();
        if (params.body) {
          var key = objectId_to_S3key(params._id);
          var body = params.body;
          var type = params.contentType;
          self.s3.write(key, body, type, function (err) {
            if (err) {
              next(err, params);
            } else {
              self.s3.getInfo(key, function (err, info) {
                params.length = Number(info.ContentLength);
                params.uploadDate = (new moment(info.LastModified)).toDate();
                next(err, params);
              })
            }
          })
        } else {
          next(null, params);
        }
      }
    ],
    function (err, params) {
      var object = {
        _id: params._id,
        filename: params.filename,
        length: params.length,
        uploadDate: params.uploadDate || new Date(),
        contentType: params.contentType
      };
      callback(err, object);
    }
  )
};

module.exports = S3Index;
