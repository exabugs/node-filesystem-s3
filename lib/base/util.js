"use strict";

/**
 * obj[key] 取得
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @param {Any} [val=undefined] プロパティが存在しなかった場合の返り値
 * @return {Any} プロパティが存在した場合はその値を、無ければ<code>val</code>の値
 */
module.exports.getValue = function (obj, key, val) {
  return this.getObject(obj, key, function (err, obj, key) {
    return err ? val : obj[key];
  }, true);
};

/**
 * obj[key] 設定
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @param {Any} val セットする値
 */
module.exports.setValue = function (obj, key, val) {
  return this.getObject(obj, key, function (err, obj, key) {
    return err ? false : obj[key] = val;
  }, false);
};

/**
 * obj[key] 確認
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @return {Boolean} プロパティが存在するかどうか？
 */
module.exports.hasValue = function (obj, key) {
  return this.getObject(obj, key, function (err, obj, key) {
    return err ? false : key in obj;
  }, true);
};

/**
 * obj[key] 削除
 * @param {Object} obj アクセスされるオブジェクト
 * @param {String} key アクセスするプロパティを表す文字列
 * @return {Boolean} プロパティを削除できたか？
 */
module.exports.delValue = function (obj, key) {
  return this.getObject(obj, key, function (err, obj, key) {
    return err ? false : delete obj[key];
  }, true);
};

/**
 * obj[key]にアクセスできるように
 * @private
 * @param obj
 * @param key
 * @param callback
 * @returns {*}
 */
module.exports.getObject = function (obj, key, callback, readonly) {
  var keys = key.split('.');
  var k = keys.pop();

  obj = keys.reduce(function (obj, key) {
    if (undefined === obj) {
      return undefined;
    }
    if (undefined === obj[key]) {
      if (readonly) {
        return undefined;
      } else {
        obj[key] = {};
      }
    }
    return obj[key];
  }, obj);

  var err = (0 < keys.length && obj === undefined);

  return callback(err, obj, k);
};
