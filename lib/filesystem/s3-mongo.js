"use strict";

var DB = require('../db');
var Base = require('../base').ParanoiaBase;
var S3 = require('./s3-native');

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
 * @param callback
 */
S3Index.prototype.before_update = function (params, callback) {
  this.__super__.before_update(params, function (err, params) {
    var object = {
      _id: params._id,
      filename: params.filename,
      length: params.length,
      uploadDate: new Date(),
      contentType: params.contentType
    };
    callback(null, object);
  });
};

module.exports = S3Index;
