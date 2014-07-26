"use strict";

var DB = require('../db');
var Base = require('./base');

/**
 * フィールド定義
 */
var fields = {
  'deletedAt': { type: 'Date' }
};

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var ParanoiaBase = DB.inherits(Base, function (db, name) {
  this.class = 'ParanoiaBase';
  this.name = name || this.class;
  if (!this.initialized[this.class]) {
    this.super_.constructor(db, this.name);
    this.fields = DB.extend(fields, this.fields);
    this.initialized[this.class] = true;
  }
  return this;
});

/**
 * 検索(単数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_findOne = function (context, params, callback) {
  this.parent('before_findOne', context, params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 検索(複数)
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_find = function (context, params, callback) {
  this.parent('before_find', context, params, function (err, params) {
    paranoia_query(params);
    callback(err, params);
  });
};

/**
 * 論理削除(Soft Delete)
 * @param params
 * @param callback
 */

ParanoiaBase.prototype.delete = function (context, params, callback) {
  this.execute('delete', context, params, callback);
};

ParanoiaBase.prototype.before_delete = function (context, params, callback) {
  params.query = params.query || {};
  this.validator(this.fields, params.query, function (err) {
    callback(err, params);
  });
};

ParanoiaBase.prototype.do_delete = function (context, params, callback) {
  var query = params.query || {};
  var values = {deletedAt: new Date()};
  this.findAndModify(query, values, function (err, object) {
    callback(err, object);
  })
};

ParanoiaBase.prototype.after_delete = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 論理削除
 */
function paranoia_query(params) {
  params['query'] = params['query'] || {};
  params['query']['deletedAt'] = {$exists: false};

  /*
   // remove : 2
   var values = {deletedAt: new Date()};

   // cancel remove : 1


   // search 'not remove' : 1
   condition['deletedAt'] = {$exists: false};

   // search 'remove' : 2

   // search both : 3
   */
}

module.exports = ParanoiaBase;
