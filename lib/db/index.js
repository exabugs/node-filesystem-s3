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
    callback(err);
  });
};

exports.db = function () {
  return db;
};

/**
 *
 * @param s
 * @param c
 * @returns {*}
 */
exports.extend = function (s, c) {
  function f() {
  }

  f.prototype = s.prototype;
  c.prototype = new f();
  c.prototype.__super__ = s.prototype;    // __super__のところを superclass とかにしてもOK!!
  c.prototype.__super__.constructor = s;  // 上に同じく。但し、 super は予約語。
  c.prototype.constructor = c;
  return c;
};