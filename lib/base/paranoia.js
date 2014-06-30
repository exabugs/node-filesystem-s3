"use strict";

var DB = require('../db');
var Base = require('./Base');

/**
 * コンストラクタ
 *
 * @param name
 * @constructor
 */
var ParanoiaBase = DB.extend(Base, function (name) {
  this.__super__.constructor(name);
});

/**
 * 論理削除
 * @param params
 * @param callback
 * todo: extendsできるように
 */
ParanoiaBase.prototype.delete = function (params, callback) {
  var values = {deleted_at: new Date()};
  this.findAndModify(params.id, values, callback);
};


/**
 * 論理削除
 * todo: extendsできるように
 */
function paranoia() {

  // delete : 2
  var values = {deleted_at: new Date()};

  // cancel delete : 1


  // search 'not delete' : 1
  condition['deleted_at'] = {$exists: false};

  // search 'delete' : 2

  // search both : 3

}

module.exports = ParanoiaBase;
