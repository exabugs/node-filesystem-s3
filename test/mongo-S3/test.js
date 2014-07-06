/**
 * node-filesystem-s3
 * @author exabugs@gmail.com
 */

"use strict";

var test_backet = 'test_backet';

var Base = require('../../lib/filesystem/s3-mongo');


var DB = require('../../lib/db');
var fs = require('fs');
var path = require('path');
var should = require('should');


describe('Mongo', function () {

  it('Prepare.', function (done) {
    DB.initialize(function (err) {
      DB.collection(test_backet).drop();
      done();
    });
  });

  /**
   * 追加
   *   追加したい場合は、readstreamをbodyにセットする。
   */
  it('Insert & FindOne.', function (done) {

    var base = new Base(test_backet);

    var filename = 'popy150.png';
    var filepath = path.resolve(path.join('test', 'mongo-s3', filename));
    var stream = fs.createReadStream(filepath);

    // 追加したい場合は、readstreamをbodyにセットする。
    var params = {
      filename: filename,
      body: stream,
      contentType: 'image/png'
    };

    var get_fields = {
      _id: 1,
      filename: 1,
      contentType: 1
    };

    base.update({values: params}, function (err, result) {
      var _id = result._id;
      base.findOne({query: {_id: _id}, fields: get_fields}, function (err, result) {

        var expect = {
          _id: result._id,
          filename: filename,
          contentType: 'image/png'
        };

        result.should.eql(expect);
        done();
      });
    });
  });

  /**
   * 取得
   *   取得したい場合は、fieldsでbodyを1にする。
   *    → 結果オブジェクトのbodyにreadstreamがセットされる。
   */
  it('Insert & FindOne (File Load Check).', function (done) {

    var base = new Base(test_backet);

    var filename = 'popy150.png';
    var filepath0 = path.resolve(path.join('test', 'mongo-s3', filename));
    var stream = fs.createReadStream(filepath0);

    var params = {
      filename: filename,
      body: stream,
      contentType: 'image/png'
    };

    var get_fields = {
      _id: 1,
      body: 1
    };

    base.update({values: params}, function (err, result) {
      var _id = result._id;
      base.findOne({query: {_id: _id}, fields: get_fields}, function (err, result) {

        // ストリーム処理が面倒なので一度ファイルに受ける
        var filepath1 = path.resolve(path.join('logs', filename));
        var ws = fs.createWriteStream(filepath1);
        result.body.pipe(ws);

        ws.on('close', function () {
          var a0 = fs.readFileSync(filepath0).toString('base64');
          var a1 = fs.readFileSync(filepath1).toString('base64');
          should.equal(a0, a1);
          done();
        });
      });
    });
  });

});
