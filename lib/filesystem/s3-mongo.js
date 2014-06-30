"use strict";

var DB = require('../db');
var Base = require('../base').Base;
var S3 = require('./s3-native')

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var S3Index = DB.extend(Base, function (name) {
  this.__super__.constructor(name);
  this.s3 = new S3(name);
});

/**
 *
 * @param params
 * @returns {{filename: *, length: *, uploadDate: Date, contentType: string}}
 */
S3Index.prototype.before_save = function (params, callback) {
  var object = {
    filename: params.filename,
    length: params.length,
    uploadDate: new Date(),
    contentType: params.contentType
  };
  callback(null, object);
};

module.exports = S3Index;
