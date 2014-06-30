"use strict";

var async = require('async');
var DB = require('../db');

var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

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

Base.prototype.after_findOne = function (params, result, callback) {
  callback(null, result);
};

Base.prototype.findOne = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_findOne(params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
        var options = {fields: params.fields};
        self.collection.findOne(query, options, function (err, result) {
          next(err, result);
        });
      },
      function (result, next) {
        self.after_findOne(params, result, function (err, result) {
          next(err, result);
        })
      }],
    function (err, result) {
      callback(err, result);
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
        self.before_find(params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
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
 * 追加
 * @param params
 * @param callback
 */
/*
 Base.prototype.before_insert = function (params, callback) {
 callback(null, params);
 };

 Base.prototype.after_insert = function (params, object, callback) {
 callback(null, object);
 };

 Base.prototype.insert = function (params, callback) {
 var self = this;
 async.waterfall([
 function (next) {
 self.before_insert(params, function (err, params) {
 next(err, params);
 })
 },
 function (params, next) {
 self.collection.insert(params, function (err, object) {
 next(err, object);
 })
 },
 function (object, next) {
 self.after_insert(params, object, function (err, object) {
 next(err, object);
 })
 }],
 function (err, object) {
 callback(err, object);
 });
 };
 */
/**
 * 保存(追加/更新)
 * @param params
 * @param callback
 */

Base.prototype.before_update = function (params, callback) {
  callback(null, params);
};

Base.prototype.after_update = function (params, object, callback) {
  callback(null, object);
};

Base.prototype.update = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_update(params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        if (!params._id) params._id = new ObjectID();
        self.findAndModify(params._id, params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_update(params, object, function (err, object) {
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
      function (params, next) {
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
 * 保存(追加/更新)
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
 * 削除
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
