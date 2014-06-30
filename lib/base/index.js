"use strict";

var async = require('async');
var DB = require('../db');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
function Base(name) {
  this.name = name;
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
 * @param callback
 */

Base.prototype.before_save = function (params, callback) {
  var object = {};
  callback(null, object);
};

Base.prototype.after_save = function (params, object, callback) {
  callback(null, object);
};

Base.prototype.save = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_save(params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.findAndModify(params._id, object, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_save(params, object, function (err, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      callback(err, object);
    });
};

/**
 *
 * @param params
 * @param callback
 */
Base.prototype.delete = function (params, callback) {
  var values = {deleted_at: new Date()};
  this.findAndModify(params.id, values, callback);
};

/**
 *
 * @param params
 * @param callback
 */
Base.prototype.before_destroy = function (params, callback) {
  var object = {};
  callback(null, object);
};

Base.prototype.after_destroy = function (params, object, callback) {
  callback(null, object);
};

Base.prototype.destroy = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_destroy(params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.findAndRemove(params._id, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_destroy(params, object, function (err, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      callback(err, object);
    });
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
    {_id: _id},
    [],
    {$set: values},
    {upsert: true, new: true},
    function (err, result) {
      callback(err, result);
    }
  );
};

Base.prototype.findAndRemove = function (_id, callback) {
  this.collection.findAndRemove(
    {_id: _id},
    [],
    function (err, result) {
      callback(err, result);
    }
  );
};

module.exports = Base;
