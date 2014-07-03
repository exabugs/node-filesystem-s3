"use strict";

var DB = require('../db');
var Base = require('./Base');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */

var ParanoiaBase = DB.inherits(Base, function (name, db) {
  this.super_.constructor(name, db);
});

/**
 * 検索(単数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_findOne = function (params, callback) {
  this.super_.before_findOne(params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 検索(複数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_find = function (params, callback) {
  this.super_.before_find(params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 論理削除(Soft Delete)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_delete = function (params, callback) {
  callback(null, params);
};

ParanoiaBase.prototype.after_delete = function (params, object, callback) {
  callback(null, params, object);
};

ParanoiaBase.prototype.delete = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_delete(params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        var values = {deleted_at: new Date()};
        self.findAndModify(params._id, values, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_delete(params, object, function (err, params, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      callback(err, object);
    });
};

/**
 * 論理削除
 */
function paranoia_query(params) {
  params['query'] = params['query'] || {};
  params['query']['deleted_at'] = {$exists: false};

  /*
   // remove : 2
   var values = {deleted_at: new Date()};

   // cancel remove : 1


   // search 'not remove' : 1
   condition['deleted_at'] = {$exists: false};

   // search 'remove' : 2

   // search both : 3
   */
}

module.exports = ParanoiaBase;
