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


describe('Mongo', function () {

  it('Prepare.', function (done) {
    DB.initialize(function (err) {
      DB.collection(test_backet).drop();
      done();
    });
  });

  var params0 = {
    _id: 'test0',
    filename: 'test0',
    length: 120,
    contentType: 'text/plain'
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

  /*
   4バイトの，Unixエポックからの経過秒数(Unix時間)
   3バイトのマシンID
   2バイトのプロセスID
   3バイトのカウンタ(開始番号はランダム)
   */
  it('Insert.', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.update({query: {_id: params0._id}, values: params0}, function (err, result) {
      base1.findOne({query: {_id: params0._id}, fields: fields}, function (err, result) {
        result.should.eql(params0);
        done();
      });
    });
  });

  it('List.', function (done) {

    var base1 = new Base1(null, test_backet);

    base1.update({query: {_id: params1._id}, values: params1}, function (err, result) {
      base1.find({query: {contentType: 'text/html'}, fields: fields}, function (err, result) {
        result.length.should.eql(1);
        result[0].should.eql(params1);
        done();
      });
    });
  });

  it('Delete.', function (done) {

    var base0 = new Base0(null, test_backet); // 物理削除
    var base1 = new Base1(null, test_backet); // 論理削除

    base1.update({query: {_id: params0._id}, values: params0}, function (err, result) {
      base1.delete({query: {_id: params0._id}}, function (err, result) {
        base1.findOne({query: {_id: params0._id}, fields: fields}, function (err, result) {
          should.equal(result, null, '論理削除されているので見つからない');
          base0.findOne({query: {_id: params0._id}, fields: fields}, function (err, result) {
            result.should.eql(params0, '論理削除ではないモジュールを使うと見つかる');
            base0.destroy({query: {_id: params0._id}}, function (err, result) {
              base0.findOne({query: {_id: params0._id}, fields: fields}, function (err, result) {
                should.equal(result, null, '物理削除されているので見つからない');
                done();
              });
            });
          });
        });
      });
    });
  });


});
