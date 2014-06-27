"use strict";

var MongoClient = require("mongodb").MongoClient;

exports.url = function () {
  return 'mongodb://127.0.0.1:27017/test';
}

exports.open = function (callback) {
  MongoClient.connect(this.url(), function (err, db) {
    callback(err, db);
  });
}

