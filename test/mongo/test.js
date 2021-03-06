/**
 * node-filesystem-s3
 * @author exabugs@gmail.com
 */

"use strict";

var test_backet = 'test_backet';

var Base0 = require('../../lib/base').Base;
var Base1 = require('../../lib/base').ParanoiaBase;

var DB = require('../../lib/db');
var fs = require('fs');
var path = require('path');
var should = require('should');
var async = require('async');

var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

describe('Mongo', function () {

  it('Prepare.', function (done) {
    DB.initialize(function (err) {
      DB.collection(test_backet).drop();
      done();
    });
  });

  var params00 = {
    //_id: 'test00',
    filename: 'test00',
    length: 120,
    contentType: 'text/plain'
  };

  var params01 = {
    _id: 'test00',
    filename: 'test01',
    length: 500,
    contentType: 'text/xml'
  };


  var params02 = {
    _id: 'test02',
    filename: 'test02',
    length: 120,
    contentType: 'text/plain'
  };

  var params03 = {
    _id: 'test03',
    filename: 'test03',
    length: 130,
    contentType: 'text/html'
  };

  var params1 = {
    _id: 'test1',
    filename: 'test1',
    length: 140,
    contentType: 'text/html'
  };

  var fields = {
    _id: 1,
    filename: 1,
    length: 1,
    contentType: 1
  };

  /**
   *・instanceof 演算子
   * instanceof 演算子は、あるオブジェクトが指定のオブジェクトか、または指定のオブジェクトから派生しているかを確認できる。
   * 指定のオブジェクトから派生したオブジェクトであればtrue、そうでなければfalseを返す。
   * ここで言う派生とは、プロトタイプチェーンで辿れることを意味する。
   *
   * ・typeof 演算子
   * typeof 演算子は、ある値のデータ型を調べ、その文字列を返す。
   * 返される文字列は、number, string, boolean, object, function, undefined のいずれかである。
   *
   */
  it('Inherit.', function (done) {
    var base1 = new Base1(null, test_backet);

    should.equal(base1 instanceof Base0, true);
    should.equal(base1 instanceof Base1, true);

    done();
  });

  //var context = {user: {_id: 'test'}};
  var context = {};

  var oreore_id = null;
  /**
   * オレオレIDマッピング
   */
  it('Oreore ID.', function (done) {
    var base = new Base0(null, test_backet);
    base.map(context, "oreore_id", function (err, _id) {
      oreore_id = _id; // 次テスト(Validation)で使用する
      done();
    });
  });

  /**
   * Validation
   */
  it('Validation.', function (done) {
    var base = new Base0(null, test_backet);

    var data = [
      ['Number', '', 0],
      ['Number', '-1', -1],
      ['Number', null, null],

      ['Date', '2014-08-06T02:17:07.628Z', new Date(Date.parse('2014-08-06T02:17:07.628Z'))],
      ['Date', '2014-08-06T02:17:07Z', new Date(Date.parse('2014-08-06T02:17:07Z'))],
      ['Date', '', null],
      ['Date', null, null],

      ['Boolean', 'true', true],
      ['Boolean', 'false', false],
      ['Boolean', '', false],
      ['Boolean', 'oops', false],
      ['Boolean', null, null],

      ['ObjectID', '', null],
      ['ObjectID', null, null],
      ['ObjectID', '53e18a1d6cf0820000aee8fc', new ObjectID('53e18a1d6cf0820000aee8fc')],
      ['ObjectID', 'oreore_id', oreore_id], // オレオレIDマッピング

      ['String', '', ''],
      ['String', null, null]
    ];


    async.eachSeries(data, function (input, next) {
      base.valid({}, input[1], input[0], function (err, output) {
        // オブジェクト(Date/ObjectID)だとshould.equalできないのでJSON.stringifyして検証する
        var data1 = JSON.stringify(output);
        var data2 = JSON.stringify(input[2]);
        should.equal(data1, data2);
        next();
      });
    }, function (err) {
      done(err);
    });
  });

  /*
   4バイトの，Unixエポックからの経過秒数(Unix時間)
   3バイトのマシンID
   2バイトのプロセスID
   3バイトのカウンタ(開始番号はランダム)
   */

  // POST resources
  it('Insert.1', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.create(context, {values: params00}, function (err, result) {

      (err === null).should.be.true;
      done();
    });
  });

  // POST resources _idをvaluesに含む
  it('Insert.2', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.create(context, {query: {}, values: params01}, function (err, result) {

      (err === null).should.be.true;

      // オレオレIDで検索
      base1.findOne(context, {query: {_id: params01._id}, fields: fields}, function (err, result) {

        (err === null).should.be.true;

        result._id = params01._id;
        result.should.eql(params01);
        done();
      });
    });
  });

  // POST resources _idをvaluesに含む
  it('Insert.3 duplicate _id', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.create(context, {query: {}, values: params01}, function (err, result) {

      (err === null).should.be.false;
      done();
    });
  });

  // insert.2で追加したドキュメントを更新
  it('Update.', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.update(context, {query: {_id: params01._id}, values: {title: 'test010'}}, function (err, result) {

      (err === null).should.be.true;
      (result !== null).should.be.true;

      done();
    });
  });

  it('Update. not exist document', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.update(context, {query: {_id: params02._id}, values: params02}, function (err, result) {

      (err === null).should.be.true;
      (result === null).should.be.true;

      done();
    });
  });

  it('Update(Upsert). not exist document', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.update(context, {query: {_id: params02._id}, values: params02, options: {upsert: true}}, function (err, result) {

      (err === null).should.be.true;
      (result === null).should.be.false;

      done();
    });
  });

  it('List.', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.create(context, {query: {_id: params1._id}, values: params1}, function (err, result) {
      base1.find(context, {query: {contentType: 'text/html'}, fields: fields}, function (err, result) {
        result.length.should.eql(1);

        result[0]._id = params1._id;
        result[0].should.eql(params1);
        done();
      });
    });
  });

  it('Delete.', function (done) {

    var base0 = new Base0(null, test_backet); // 物理削除
    var base1 = new Base1(null, test_backet); // 論理削除

    base1.create(context, {query: {_id: params03._id}, values: params03}, function (err, result) {
      base1.delete(context, {query: {_id: params03._id}}, function (err, result) {
        base1.findOne(context, {query: {_id: params03._id}, fields: fields}, function (err, result) {
          should.equal(result, null, '論理削除されているので見つからない');
          base0.findOne(context, {query: {_id: params03._id}, fields: fields}, function (err, result) {
            result._id = params03._id;
            result.should.eql(params03, '論理削除ではないモジュールを使うと見つかる');
            base0.destroy(context, {query: {_id: params03._id}}, function (err, result) {
              base0.findOne(context, {query: {_id: params03._id}, fields: fields}, function (err, result) {
                should.equal(result, null, '物理削除されているので見つからない');
                done();
              });
            });
          });
        });
      });
    });
  });

  /**
   * find/findOne を実行しても query パラメータが変更されないこと
   */
  it('parameter not modified.', function (done) {

    var base0 = new Base0(null, test_backet); // 物理削除
    var base1 = new Base1(null, test_backet); // 論理削除

    var _id = new ObjectID('53e1daf05edcb70000b162e7');
    var param0 = {query: {_id: _id}};
    var param1 = {query: {_id: _id}};

    valid(param0, param1);

    base0.findOne(context, param0, function (err, result) {
      valid(param0, param1);
      base1.findOne(context, param0, function (err, result) {
        valid(param0, param1);
        base0.find(context, param0, function (err, result) {
          valid(param0, param1);
          base1.find(context, param0, function (err, result) {
            valid(param0, param1);
            done();
          });
        });
      });
    });

    function valid(a, b) {
      var sa = JSON.stringify(a);
      var sb = JSON.stringify(b);
      should.equal(sa, sb);
    }
  });


});
