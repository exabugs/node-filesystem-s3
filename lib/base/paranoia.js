"use strict";

var DB = require('../db');
var Base = require('./Base');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var ParanoiaBase = DB.extend(Base, function (name) {
  this.__super__.constructor(name);
});

/**
 * 検索(単数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_findOne = function (params, callback) {
  this.__super__.before_findOne(params, function (err, params) {
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
  this.__super__.before_find(params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 論理削除
 * @param params
 * @param callback
 */

ParanoiaBase.prototype.before_delete = function (params, callback) {
  callback(null, params);
};

ParanoiaBase.prototype.after_delete = function (params, object, callback) {
  callback(null, object);
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
        self.after_delete(params, object, function (err, object) {
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
   // delete : 2
   var values = {deleted_at: new Date()};

   // cancel delete : 1


   // search 'not delete' : 1
   condition['deleted_at'] = {$exists: false};

   // search 'delete' : 2

   // search both : 3
   */
}

module.exports = ParanoiaBase;
