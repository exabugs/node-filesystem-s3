"use strict";

var async = require('async');
var DB = require('../db');

var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

/**
 * フィールド定義
 */
var fields = [
  { name: "_id", type: ObjectID },
  { name: "created_at", type: Date }
];

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 *
 * @see http://blog.livedoor.jp/aki_mana/archives/2383135.html
 * prototype プロパティを参照するのは new されて生成したインスタンスのみです。
 */

var Base = function (name, db) {
  this.class = 'Base';
  this.name = name;
  if (!this.initialized[this.class]) {
    this.database = db || DB;
    this.fields = fields;
    this.initialized[this.class] = true;
  }
  return this;
};

Base.prototype.initialized = {};

/**
 * フィールド定義
 */
/*
 Base.prototype.metadata = {
 fields: [
 { name: "_id", type: ObjectID },
 { name: "created_at", type: Date }
 ]
 };
 */
Base.prototype.collection = function () {
  return this.database.collection(this.name);
};

/**
 * 検索(単数)
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.before_findOne = function (self, params, callback) {
  params.query = params.query || {};
  this.validator(self.fields, params.query);
  callback(null, params);
};

Base.prototype.after_findOne = function (self, params, object, callback) {
  callback(null, params, object);
};

Base.prototype.findOne = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_findOne(self, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
        var options = {fields: params.fields};
        self.collection().findOne(query, options, function (err, object) {
          next(err, object);
        });
      },
      function (object, next) {
        self.after_findOne(self, params, object, function (err, params, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      callback(err, object);
    });
};

/**
 * 検索(複数)
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.before_find = function (self, params, callback) {
  params.query = params.query || {};
  this.validator(self.fields, params.query);
  callback(null, params);
};

Base.prototype.after_find = function (self, params, objects, callback) {
  callback(null, params, objects);
};

Base.prototype.find = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_find(self, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
        var options = {fields: params.fields};
        self.collection().find(query, options).toArray(function (err, objects) {
          next(err, objects);
        });
      },
      function (objects, next) {
        self.after_find(self, params, objects, function (err, params, objects) {
          next(err, objects);
        })
      }],
    function (err, objects) {
      callback(err, objects);
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
 *     query: {_id: ObjectId('.......')}
 *     values: {$set: {'xxx.yyy': 'zzz'}}
 * @param callback
 */

Base.prototype.before_update = function (self, params, callback) {
  params.query = params.query || {};
  this.validator(self.fields, params.query);
  this.validator(self.fields, params.values);
  callback(null, params);
};

Base.prototype.after_update = function (self, params, object, callback) {
  callback(null, params, object);
};

Base.prototype.update = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_update(self, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
        var values = params.values || {};
        self.findAndModify(query, values, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_update(self, params, object, function (err, params, object) {
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

Base.prototype.before_destroy = function (self, params, callback) {
  params.query = params.query || {};
  this.validator(self.fields, params.query);
  callback(null, params);
};

Base.prototype.after_destroy = function (self, params, object, callback) {
  callback(null, params, object);
};

Base.prototype.destroy = function (params, callback) {
  var self = this;
  async.waterfall([
      function (next) {
        self.before_destroy(self, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        var query = params.query || {};
        self.findAndRemove(query, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self.after_destroy(self, params, object, function (err, params, object) {
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

Base.prototype.findAndModify = function (query, values, callback) {
  this.collection().findAndModify(
    query,
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

Base.prototype.findAndRemove = function (query, callback) {
  this.collection().findAndRemove(
    query,
    [],
    function (err, result) {
      callback(err, result);
    }
  );
};

/**
 *
 * @param value
 */
Base.prototype.validator = function (fields, params) {
  var value = params._id;
  if (value) {
    if (value instanceof ObjectID) {
      // Do Nothing.
    } else if (value && value.toString().match(/[a-f0-9]{24}/)) {
      params._id = ObjectID(value.toString());
    } else {
      // Do Nothing.
    }
  }
};

module.exports = Base;
