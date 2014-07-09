"use strict";

var DB = require('../db');
var Base = require('./base');

/**
 * フィールド定義
 */
var fields = {
  'deleted_at': { type: 'Date' }
};

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var ParanoiaBase = DB.inherits(Base, function (name, db) {
  this.class = 'ParanoiaBase';
  this.name = name;
  if (!this.initialized[this.class]) {
    this.super_.constructor(name, db);
    this.fields = DB.extend(this.fields, fields);
    this.initialized[this.class] = true;
  }
  return this;
});

/**
 * 検索(単数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_findOne = function (self, params, callback) {
  this.super_.before_findOne(self, params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 検索(複数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_find = function (self, params, callback) {
  this.super_.before_find(self, params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 論理削除(Soft Delete)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_delete = function (self, params, callback) {
  params.query = params.query || {};
  this.objectID(params.query);
  callback(null, params);
};

ParanoiaBase.prototype.after_delete = function (self, params, object, callback) {
  callback(null, params, object);
};

ParanoiaBase.prototype.delete = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_delete(self, params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        var query = params.query || {};
        var values = {deleted_at: new Date()};
        self.findAndModify(query, values, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_delete(self, params, object, function (err, params, object) {
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
