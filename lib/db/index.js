"use strict";

var MongoClient = require("mongodb").MongoClient;

exports.url = function () {
  return 'mongodb://127.0.0.1:27017/test';
}

var db;

/**
 * MongoClient.connect once and reusing the database variable returned by the callback:
 * http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html#mongoclient-connection-pooling
 */
exports.initialize = function (callback) {
  MongoClient.connect(this.url(), function (err, database) {
    if (err) throw err;
    db = database;
    callback && callback(err);
  });
  return this;
};

exports.db = function () {
  return db;
};

exports.collection = function (name) {
  return db.collection(name);
};

/**
 * 継承
 * @param s
 * @param c
 * @returns {*}
 * @see http://d.hatena.ne.jp/shogo4405/20070121/1169394889
 */

exports.inherits = function (s, c) {
  c.prototype = Object.create(s.prototype, {
    constructor: {
      value: c,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
//c.prototype.constructor = c;
  c.prototype.super_ = s.prototype;
  c.prototype.super_.constructor = s;
  return c;
};

/**
 * 拡張
 * @param object {Object}
 * @param master {Object}
 * @param attrs {Array}
 */
exports.extend = function (object, master, attrs) {
  object = object || {};
  if (!(attrs instanceof Array)) {
    attrs = Object.keys(master);
  }
  for (var i = 0; i < attrs.length; i++) {
    var x = attrs[i];
    object[x] = master[x];
  }
  return object;
};

/*
 exports.extend = function (o) {
 var f = this.extend.f, i, len, n, prop;
 f.prototype = o;
 n = new f;
 for (i = 1, len = arguments.length; i < len; ++i)
 for (prop in arguments[i])
 n[prop] = arguments[i][prop];
 return n;
 }
 exports.extend.f = function () {
 };
 */