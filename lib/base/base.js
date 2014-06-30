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
 * 検索(単数)
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.before_findOne = function (params, callback) {
  callback(null, params);
};

Base.prototype.after_findOne = function (params, results, callback) {
  callback(null, results);
};

Base.prototype.findOne = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_findOne(params, function (err, object) {
          next(err, object);
        })
      },
      function (params, next) {
        var query = params.query || {};
        query['deleted_at'] = {$exists: false};
        var options = {fields: params.fields};
        self.collection.findOne(query, options, function (err, result) {
          next(err, result);
        });
      },
      function (results, next) {
        self.after_findOne(params, results, function (err, results) {
          next(err, results);
        })
      }],
    function (err, results) {
      callback(err, results);
    });
};

/**
 * 検索(複数)
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.before_find = function (params, callback) {
  callback(null, params);
};

Base.prototype.after_find = function (params, results, callback) {
  callback(null, results);
};

Base.prototype.find = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_find(params, function (err, object) {
          next(err, object);
        })
      },
      function (params, next) {
        var query = params.query || {};
        query['deleted_at'] = {$exists: false};
        var options = {fields: params.fields};
        self.collection.find(query, options).toArray(function (err, results) {
          next(err, results);
        });
      },
      function (results, next) {
        self.after_find(params, results, function (err, results) {
          next(err, results);
        })
      }],
    function (err, results) {
      callback(err, results);
    });
};

/**
 * 保存(追加/更新)
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
 * 削除
 * @param params
 * @param callback
 */
Base.prototype.before_destroy = function (params, callback) {
  callback(null, params);
};

Base.prototype.after_destroy = function (params, object, callback) {
  callback(null, object);
};

Base.prototype.destroy = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_destroy(params, function (err, params) {
          next(err, params);
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

/**
 *
 * @param _id
 * @param values
 * @param callback
 */
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

/**
 *
 * @param _id
 * @param callback
 */
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
