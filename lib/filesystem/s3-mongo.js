"use strict";

var DB = require('../db');
var Base = require('./base');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var S3Index = DB.extend(Base, function (name) {
  this.__super__.constructor(name);
});

/**
 *
 * @param params
 * @returns {{filename: *, length: *, uploadDate: Date, contentType: string}}
 */
S3Index.prototype.pre_insert = function (params) {

  var object = {
    filename: params.filename,
    length: params.length,
    uploadDate: new Date(),
    contentType: params.contentType
  };

  return object;
};

module.exports = S3Index;
