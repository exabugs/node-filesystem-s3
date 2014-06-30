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
 * @see http://d.hatena.ne.jp/shogo4405/20070121/1169394889
 */
exports.extend = function (s, c) {
  c.prototype = Object.create(s.prototype);
  c.prototype.constructor = c;
  c.prototype.__super__ = s.prototype;
  c.prototype.__super__.constructor = s;
  return c;
};