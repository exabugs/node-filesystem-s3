"use strict";

var async = require('async');
var DB = require('../db');

var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

/**
 * フィールド定義
 */
var fields = {
  '_id': { type: 'ObjectID' },
  'updatedAt': { type: 'Date' },
  'createdAt': { type: 'Date' }
};

/**
 * 独自IDをObjectIDにマッピングするコレクション
 * TTL : 60分
 */
var mappings = 'sysdata.mappings';
var TTL = 3600;

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 *
 * @see http://blog.livedoor.jp/aki_mana/archives/2383135.html
 * prototype プロパティを参照するのは new されて生成したインスタンスのみです。
 */

var Base = function (db, name) {
  this.class = 'Base';
  this.name = name || this.class;
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
 * prototypeチェーン実装 (サブクラスから親クラスの関数の実行)
 * @param name : 関数名
 * @param 引数
 */
Base.prototype.parent = function (name) {
  var self = this;
  while (!self.hasOwnProperty(name)) self = self.super_; // step 1
  self = self.super_ || self;
  while (!self.hasOwnProperty(name)) self = self.super_; // step 2
  var arg = [];
  for (var i = 1; i < arguments.length; i++) arg.push(arguments[i]);
  self[name].apply(self, arg);
};

/**
 * 処理実行
 * @param context  : 追加情報
 * @param name     : 関数名称
 * @param params   : 関数パラメータ
 * @param callback
 */
Base.prototype.execute = function (name, context, params, callback) {
  var self = this;
  context.module = context.module || this;
  async.waterfall([
      function (next) {
        self['before_' + name].call(self, context, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        self['do_' + name].call(self, context, params, function (err, object) {
          next(err, object);
        })
      },
      function (object, next) {
        self['after_' + name].call(self, context, params, object, function (err, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      err && console.log(err);
      callback(err, object);
    });
};


/**
 * 検索(単数)
 * @param context  : 追加情報
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.findOne = function (context, params, callback) {
  this.execute('findOne', context, params, callback);
};

Base.prototype.before_findOne = function (context, params, callback) {
  params.query = params.query || {};
  context.module.validator(context.module.fields, params.query, function (err, query) {
    callback(err, params);
  });
};

Base.prototype.do_findOne = function (context, params, callback) {
  var query = params.query || {};
  var options = {fields: params.fields};
  context.module.collection().findOne(query, options, function (err, object) {
    callback(err, object);
  });
};

Base.prototype.after_findOne = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 検索(複数)
 * @param context  : 追加情報
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.find = function (context, params, callback) {
  this.execute('find', context, params, callback);
};

Base.prototype.before_find = function (context, params, callback) {
  params.query = params.query || {};
  context.module.validator(context.module.fields, params.query, function (err) {
    callback(err, params);
  });
};

Base.prototype.do_find = function (context, params, callback) {
  var query = params.query || {};
  var options = params.options || {};
  options.fields = params.fields;
  context.module.collection().find(query, options).toArray(function (err, objects) {
    callback(err, objects);
  });
};

Base.prototype.after_find = function (context, params, objects, callback) {
  callback(null, objects);
};

/**
 * 保存(追加/更新)
 * @param context  : 追加情報
 * @param params
 *     query: {_id: ObjectId('.......')}
 *     values: {$set: {'xxx.yyy': 'zzz'}}
 * @param callback
 */

Base.prototype.update = function (context, params, callback) {
  this.execute('update', context, params, callback);
};

Base.prototype.before_update = function (context, params, callback) {
  params.query = params.query || {};
  context.module.validator(context.module.fields, params.query, function (err) {
    context.module.validator(context.module.fields, params.values, function (err) {
      callback(err, params);
    });
  });
};

Base.prototype.do_update = function (context, params, callback) {
  var query = params.query || {};
  var values = params.values || {};
  context.module.findAndModify(query, values, function (err, object) {
    callback(err, object);
  })
};

Base.prototype.after_update = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 削除
 * @param context  : 追加情報
 * @param params
 * @param callback
 */

Base.prototype.destroy = function (context, params, callback) {
  this.execute('destroy', context, params, callback);
};

Base.prototype.before_destroy = function (context, params, callback) {
  params.query = params.query || {};
  context.module.validator(context.module.fields, params.query, function (err) {
    callback(err, params);
  });
};

Base.prototype.do_destroy = function (context, params, callback) {
  var query = params.query || {};
  context.module.findAndRemove(query, function (err, object) {
    callback(err, object);
  })
};

Base.prototype.after_destroy = function (context, params, object, callback) {
  callback(null, params, object);
};

/**
 * 保存(追加/更新)
 * @param _id
 * @param values
 * @param callback
 */

Base.prototype.findAndModify = function (query, values, callback) {
  var updatedAt = values.updatedAt;
  values.updatedAt = new Date();
  this.collection().findAndModify(
    query,
    [],
    {
      $set: values,
      $setOnInsert: {createdAt: new Date()}
    },
    {upsert: true, new: true},
    function (err, result) {
      updatedAt ? values.updatedAt = updatedAt : delete values.updatedAt;
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
Base.prototype.validator = function (fields, params, callback) {
  var self = this;
  var keys = Object.keys(params);
  async.map(keys, function (key, next) {

    if (!fields[key]) {
      console.log("Not Defined Attribute : [" + key + "]\n");
      next(null, params[key]);
    } else {
      var type = fields[key].type;
      var array = fields[key].array;
      var value = params[key];

      if (array) {
        async.map(value, function (data, next) {
          self.valid(data, type, function (err, data) {
            next(err, data);
          });
        }, function (err, value) {
          next(err, value);
        });
      } else {
        self.valid(value, type, function (err, value) {
          next(err, value);
        });
      }
    }
  }, function (err, values) {
    keys.forEach(function (key, index) {
      params[key] = values[index];
    });
    callback(err, params);
  });
};

Base.prototype.valid = function(value, type, next) {
  if (value) {
    switch (type) {
      case 'Number':
        value = Number(value);
        next(null, value);
        break;
      case 'Date':
        value = new Date(Date.parse(value));
        next(null, value);
        break;
      case 'Boolean':
        if (typeof value !== 'boolean') {
          value = (value.toString() === 'true');
        }
        next(null, value);
        break;
      case 'ObjectID':
        if (value.toString().match(/[a-f0-9]{24}/)) {
          value = ObjectID(value.toString());
          next(null, value);
        } else {
          // 独自IDはObjectIDに置換する
          this.map(value, function (err, value) {
            next(err, value);
          });
        }
        break;
      default:
        next(null, value);
        break;
    }
  } else {
    next(null, value);
  }
};

Base.prototype.map = function (value, callback) {
  var value = value.toString();
  var collection = this.database.collection(mappings);
  collection.ensureIndex({updatedAt: 1}, {expireAfterSeconds: TTL}, function () {
    collection.findAndModify(
      {key: value},
      [],
      { $set: {key: value, updatedAt: new Date()},
        $setOnInsert: {createdAt: new Date()}
      },
      {upsert: true, new: true},
      function (err, result) {
        callback(err, result._id);
      }
    );
  });
};

module.exports = Base;
