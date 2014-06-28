"use strict";

var DB = require('../db');
var S3 = require('./s3-native');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
function Base(name) {
  this.name = name;
  this.s3 = new S3(name);
  this.collection = DB.db().collection(this.name);
}

/**
 *
 * @param params
 *     _id:
 *     fields: 抽出したいフィールド
 * @param callback
 */
Base.prototype.findOne = function (params, callback) {
  this.collection.findOne(
    {
      _id: params._id
    },
    {
      fields: params.fields
    },
    function (err, result) {
      callback(err, result);
    }
  );
};

/**
 *
 * @param params
 *     fields: 抽出したいフィールド
 * @param callback
 */
Base.prototype.find = function (params, callback) {
  var condition = params.condition;
  condition['deleted_at'] = {$exists: false};

  var fields = params.fields;

  this.collection.find(condition, fields).toArray(function (err, results) {
    callback(null, results);
  });
};

/**
 *
 * @param params
 *   _id:
 *   filename:
 *   length:
 *   contentType:
 * @param callback
 */
Base.prototype.pre_insert = function (params) {
  var object = {};
  return object;
};

Base.prototype.insert = function (params, callback) {
  var object = this.pre_insert(params);
  this.findAndModify(
    params._id,
    object,
    callback);

};

Base.prototype.delete = function (params, callback) {
  var values = {deleted_at: new Date()};
  this.findAndModify(params.id, values, callback);
};

Base.prototype.destroy = function (params, callback) {
  this.findAndRemove(params.id, callback);
};

function paranoia() {

  // delete : 2
  var values = {deleted_at: new Date()};

  // cancel delete : 1


  // search 'not delete' : 1
  condition['deleted_at'] = {$exists: false};

  // search 'delete' : 2

  // search both : 3

}

Base.prototype.findAndModify = function (_id, values, callback) {
  this.collection.findAndModify(
    {
      _id: _id
    },
    [],
    {
      $set: values
    },
    {
      upsert: true,
      new: true
    },
    function (err, result) {
      callback(err, result);
    }
  );
};

Base.prototype.findAndRemove = function (_id, callback) {
  this.collection.findAndRemove(
    {
      _id: _id
    },
    [],
    function (err, result) {
      callback(err, result);
    }
  );
};

module.exports = Base;
