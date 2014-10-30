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
  'outerId': { type: 'String' }, // 外部キー
  'order': { type: 'String' }, // ソートキー
  'parent': { type: 'ObjectID' }, // 親
  'ancestors': { type: 'ObjectID', array: true}, // 親階層
  'depth': { type: 'Number' }, // 親階層深度
  'updatedAt': { type: 'Date' },
  'createdAt': { type: 'Date' },
  'updatedBy': { type: 'Object' }, // class: 'users'
  'createdBy': { type: 'Object' }  // class: 'users'
};

/**
 * オレオレID-ObjectID マッピング・コレクション
 * TTL : 60分
 */
var mappings = 'sysdata.mappings';
var TTL = 3600;

/**
 * SELECT(find)のデフォルトソート
 */
var SORT_KEY = '_id';
var SORT_DIR = '-1'; // DESC: -1 ASC: 1

/**
 * コンストラクタ
 * @param db     MongoDBコネクション
 * @param name   コレクション名
 * @constructor
 *
 * @see http://blog.livedoor.jp/aki_mana/archives/2383135.html
 * prototype プロパティを参照するのは new されて生成したインスタンスのみです。
 */
var Base = function (db, name) {
  // thisは継承元のインスタンス
  this.class = 'Base';
  this.name = name || this.class;
  this.database = db || DB;
  this.fields = DB.extend({}, fields);
  return this;
};


/**
 * コレクション
 * @return コレクション
 */
Base.prototype.collection = function () {
  return this.database.collection(this.name);
};

/**
 * 処理実行
 * @param name      関数名称
 * @param context   追加情報
 * @param params    関数パラメータ
 * @param callback
 */
Base.prototype.execute = function (name, context, _params, callback) {
  var self = this;

  // _paramsを変更するためコピー
  var params = {};
  for (var key in _params) {
    params[key] = copy(_params[key]);
  }

  async.waterfall([
      function (next) {
        self['before_execute'].call(self, context, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        self['before_' + name].call(self, context, params, function (err, params) {
          next(err, params);
        })
      },
      function (params, next) {
        // queryは配列で指定するように(AND結合)
        if (params.query instanceof Array) {
          params.query = {$and: params.query};
        }
        next(null, params);
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
      },
      function (object, next) {
        self['after_execute'].call(self, context, params, object, function (err, object) {
          next(err, object);
        })
      }],
    function (err, object) {
      err && console.log(err);
      callback(err, object);
    });
};

/**
 * 事前・事後 処理
 * @param context
 * @param params
 * @param callback
 */

Base.prototype.before_execute = function (context, params, callback) {
  callback(null, params);
};

Base.prototype.after_execute = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 保存(追加/更新)
 * @param context  追加情報
 * @param params
 *     query: {_id: ObjectId('.......')}
 *     values: {$set: {'xxx.yyy': 'zzz'}}
 * @param callback
 */

Base.prototype.create = function (context, params, callback) {
  this.execute('create', context, params, callback);
};

Base.prototype.before_create = function (context, params, callback) {
  var self = this;

  params.query = params.query || {};
  self.validator(context, self.fields, params.query, function (err) {
    self.validator(context, self.fields, params.values, function (err) {
      callback(err, params);
    });
  });
};

Base.prototype.do_create = function (context, params, callback) {
  var self = this;

  var query = params.query || {};
  var values = params.values || {};
  self.insert(context, query, values, function (err, object) {
    callback(err, object);
  })
};

Base.prototype.after_create = function (context, params, object, callback) {
  callback(null, object);
};


/**
 * 検索(単数)
 * @param context   追加情報
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.findOne = function (context, params, callback) {
  this.execute('findOne', context, params, callback);
};

Base.prototype.before_findOne = function (context, params, callback) {
  var self = this;
  params.query = params.query || {};
  self.validator(context, self.fields, params.query, function (err, query) {
    callback(err, params);
  });
};

Base.prototype.do_findOne = function (context, params, callback) {
  var self = this;
  var query = params.query || {};
  var options = {fields: params.fields};
  self.collection().findOne(query, options, function (err, object) {
    callback(err, object);
  });
};

Base.prototype.after_findOne = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 検索(複数)
 * @param context 追加情報
 * @param params
 *     query  : 検索条件
 *     fields : 抽出したいフィールド
 * @param callback
 */

Base.prototype.find = function (context, params, callback) {
  this.execute('find', context, params, callback);
};

Base.prototype.before_find = function (context, params, callback) {
  var self = this;
  params.query = params.query || {};
  self.validator(context, self.fields, params.query, function (err) {
    callback(err, params);
  });
};

Base.prototype.do_find = function (context, params, callback) {
  var self = this;
  var query = params.query || {};
  var options = {fields: params.fields};
  var cursor = self.collection().find(query, options);

  _addDefaultSort(params);
  var sort = params.sort;

  cursor.count(function (err, total) {
    if (err) {
      callback(err);
    } else {
      context.total = total;
      var options = params.options || {};
      options.skip && cursor.skip(options.skip);
      options.limit && cursor.limit(options.limit);
      cursor.sort(sort);
      cursor.toArray(function (err, objects) {
        callback(err, objects);
      });
    }
  });
};

Base.prototype.after_find = function (context, params, objects, callback) {
  callback(null, objects);
};

/**
 * 保存(更新)
 * @param context  追加情報
 * @param params
 *     query: {_id: ObjectId('.......')}
 *     values: {$set: {'xxx.yyy': 'zzz'}}
 * @param callback
 */

Base.prototype.update = function (context, params, callback) {
  this.execute('update', context, params, callback);
};

Base.prototype.before_update = function (context, params, callback) {
  var self = this;
  params.query = params.query || {};
  self.validator(context, self.fields, params.query, function (err) {
    self.validator(context, self.fields, params.values, function (err) {
      callback(err, params);
    });
  });
};

Base.prototype.do_update = function (context, params, callback) {
  var self = this;
  var query = params.query || {};
  var values = params.values || {};
  var options = params.options || {};
  self.findAndModify(context, query, values, options, function (err, object) {
    callback(err, object);
  })
};

Base.prototype.after_update = function (context, params, object, callback) {
  callback(null, object);
};

/**
 * 削除
 * @param context  追加情報
 * @param params
 * @param callback
 */

Base.prototype.destroy = function (context, params, callback) {
  this.execute('destroy', context, params, callback);
};

Base.prototype.before_destroy = function (context, params, callback) {
  var self = this;
  params.query = params.query || {};
  self.validator(context, self.fields, params.query, function (err) {
    callback(err, params);
  });
};

Base.prototype.do_destroy = function (context, params, callback) {
  var self = this;
  var query = params.query || {};
  self.findAndRemove(query, function (err, object) {
    callback(err, object);
  })
};

Base.prototype.after_destroy = function (context, params, object, callback) {
  callback(null, params, object);
};

/**
 * 保存(追加)
 * @param context
 * @param query
 * @param values
 * @param callback
 */
Base.prototype.insert = function (context, query, values, callback) {
  var collection = this.collection();
  values = copy(values); // 変更するためシャローコピー

  values.updatedAt = new Date();
  values.updatedBy = context.user ? { _id: context.user._id } : null;

  values.createdAt = values.updatedAt;
  values.createdBy = values.updatedBy;

// MongoDB 2.6 からは、_id は $set: values に存在していればよい。
  // MongoDB 2.4 では、$set: values に存在している場合エラー。$setOnInsert に必要。
  //if (query._id) {     // for MongoDB 2.4
  //  delete values._id; // for MongoDB 2.4
  //}                    // for MongoDB 2.4

  if (query._id) {
    values._id = query._id;
  }

  collection.insert(
    values,
    {safe: true},
    function (err, result) {
      callback(err, result && result[0]);
    }
  );
};

/**
 * 保存(更新)
 * @param context   コンテキスト(ユーザ等)
 * @param query     条件
 * @param values    値
 * @param callback
 */
Base.prototype.findAndModify = function (context, query, values, options, callback) {
  var collection = this.collection();
  values = copy(values); // 変更するためシャローコピー

  values.updatedAt = new Date();
  values.updatedBy = context.user ? { _id: context.user._id } : null;

  var upsert = options.upsert || false;

  // MongoDB 2.6 からは、_id は $set: values に存在していればよい。
  // MongoDB 2.4 では、$set: values に存在している場合エラー。$setOnInsert に必要。
  if (query._id) {     // for MongoDB 2.4
    delete values._id; // for MongoDB 2.4
  }                    // for MongoDB 2.4
  collection.findAndModify(
    query,
    [],
    {
      $set: values,
      $setOnInsert: {
        createdAt: values.updatedAt,
        createdBy: values.updatedBy}
    },
    {upsert: upsert, new: true},
    function (err, result) {
      callback(err, result);
    }
  );
};

function copy(source) {
  if (source instanceof Array) {
    return source;
  } else {
    var object = {};
    for (var key in source) {
      object[key] = source[key];
    }
    return object;
  }
}

/**
 * 削除
 * @param query 条件
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
 * バリデーション
 * @param fields
 * @param params
 * @param callback
 */
Base.prototype.validator = function (context, fields, params, callback) {
  var self = this;
  var keys = Object.keys(params);
  async.map(keys, function (key, next) {
    var key_ = key.replace(/\._id$/, '');
    if (!fields[key] && !fields[key_]) {// && !fields[key_]) {
      console.log("Not Defined Attribute : [" + key + "]\n");
      next(null, params[key]);
    } else {
      if (fields[key]) {
        var type = fields[key].type;
        var array = fields[key].array;
      } else {
        var type = 'ObjectID';
        var array = false;
      }
      var value = params[key];

      if (array) {
        async.map(value, function (data, next) {
          self.valid(context, data, type, function (err, data) {
            next(err, data);
          });
        }, function (err, value) {
          next(err, value);
        });
      } else {
        self.valid(context, value, type, function (err, value) {
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

Base.prototype.valid = function (context, value, type, next) {
  if (value != null) {
    switch (type) {
      case 'Number':
        value = Number(value);
        next(null, value);
        break;
      case 'Date':
        _Date.call(this, value, function (err, value) {
          next(err, value);
        });
        break;
      case 'Boolean':
        if (typeof value !== 'boolean') {
          value = (value.toString() === 'true');
        }
        next(null, value);
        break;
      case 'ObjectID':
        _ObjectID.call(this, value, function (err, value) {
          next(err, value);
        });
        break;
      case 'Object':
        _ObjectID.call(this, value, function (err, value) {
          next(err, {_id: value});
        });
        break;
      default:
        next(null, value);
        break;
    }
  } else {
    next(null, value);
  }

  function _Date(value, next) {
    if (value instanceof Date) {
      next(null, value);
    } else {
      value = value.toString();
      if (0 < value.length) {
        value = new Date(Date.parse(value));
        next(null, value);
      } else {
        next(null, null);
      }
    }
  }

  function _ObjectID(value, next) {
    if (value instanceof ObjectID) {
      next(null, value);
    } else {
      value = value.toString();
      if (value.match(/^[a-f0-9]{24}$/)) {
        value = new ObjectID(value);
        next(null, value);
      } else if (0 < value.length) {
        // 独自IDはObjectIDに置換する
        this.map(context, value, function (err, value) {
          next(err, value);
        });
      } else {
        next(null, null);
      }
    }
  }

};

/**
 * オレオレID-ObjectID マッピング
 * @param value
 * @param callback
 */
Base.prototype.map = function (context, value, callback) {
  var self = this;
  value = value.toString();
  var collection = this.database.collection(mappings);
  collection.ensureIndex({updatedAt: 1}, {expireAfterSeconds: TTL}, function () {
    collection.ensureIndex({key: 1, createdBy: 1}, {unique: true}, function () {
      var query = {key: value};
      var values = {};

      values.updatedAt = new Date();
      values.updatedBy = context.user ? { _id: context.user._id } : null;

      collection.findAndModify(
        query,
        [],
        {
          $set: values,
          $setOnInsert: {
            createdAt: values.updatedAt,
            createdBy: values.updatedBy
          }
        },
        {upsert: true, new: true},
        function (err, result) {
          callback(err, result._id);
        }
      );
    })
  });
};

/**
 * デフォルトソートを追加する。
 *  ・sortが無ければデフォルトソートを追加
 *  ・sortが存在すれば、末尾にデフォルトソートを追加
 * →デフォルトソートがすでに存在していれば追加しない
 */
function _addDefaultSort(params) {
  var sort = params.sort;
  var defaultSort = [SORT_KEY, SORT_DIR];
  if (sort instanceof Array) {
    var existDefaultSortKey = false;
    // validate
    async.each(sort, function (sortParam, next) {
      var err;
      if ((sortParam instanceof Array) && sortParam.length == 2) {
        if (sortParam[0] == SORT_KEY)
          existDefaultSortKey = true;
      } else {
        err = "invalid sort parameter: " + sortParam;
      }
      next(err);
    }, function (err) {
      // エラー時はデフォルトソートをセット
      if (err) {
        console.warn(err);
        params.sort = [];
        params.sort.push(defaultSort);
      } else {
        // デフォルトソートキーが存在しない場合のみデフォルトソートを追加
        if (!existDefaultSortKey)
          params.sort.push(defaultSort);
      }
    });
  } else {
    params.sort = [];
    params.sort.push(defaultSort);
  }
}

module.exports = Base;
