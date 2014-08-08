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
  Base.call(this, db, name || 'ParanoiaBase'); // call super constructor
  this.fields = DB.extend(fields, this.fields);
  return this;
});

/**
 * 検索(単数)
 *
 * @param context
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_findOne = function (context, params, callback) {
  ParanoiaBase.prototype.super_.before_findOne.call(this, context, params, function (err, params) {
    add_paranoia_query(params);
    callback(err, params);
  });
};

ParanoiaBase.prototype.after_findOne = function (context, params, object, callback) {
  ParanoiaBase.prototype.super_.after_findOne.call(this, context, params, object, function (err, object) {
    del_paranoia_query(params);
    callback(err, object);
  });
};

/**
 * 検索(複数)
 *
 * @param context
 * @param params
 * @param callback
 */
ParanoiaBase.prototype.before_find = function (context, params, callback) {
  ParanoiaBase.prototype.super_.before_find.call(this, context, params, function (err, params) {
    add_paranoia_query(params);
    callback(err, params);
  });
};

ParanoiaBase.prototype.after_find = function (context, params, objects, callback) {
  ParanoiaBase.prototype.super_.after_find.call(this, context, params, objects, function (err, objects) {
    del_paranoia_query(params);
    callback(err, objects);
  });
};

/**
 * 論理削除(Soft Delete)
 *
 * @param context
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
  this.findAndModify(context, query, values, function (err, object) {
    callback(err, object);
  })
};

ParanoiaBase.prototype.after_delete = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 論理削除
 *
 * @param params
 */
function add_paranoia_query(params) {
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

function del_paranoia_query(params) {
  delete params['query']['deletedAt'];
}

module.exports = ParanoiaBase;
