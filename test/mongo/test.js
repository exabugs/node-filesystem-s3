/**
 * node-filesystem-s3
 * @author exabugs@gmail.com
 */

"use strict";

var test_backet = 'test_backet';

var S3Index = require('../../lib/filesystem/s3-mongo');
var DB = require('../../lib/db');
var fs = require('fs');
var path = require('path');
var should = require('should');

var ObjectID = require('mongodb').ObjectID;


describe('Mongo', function () {

  it('Prepare.', function (done) {
    DB.initialize(function (err) {
      done();
    });
  });

  var params0 = {
    _id: new ObjectID('539c00000000000000000000'),
    filename: 'test0',
    length: 120,
    contentType: 'text/plain'
  };

  var params1 = {
    _id: new ObjectID('539c00000000000000000001'),
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

    var s3index = new S3Index(test_backet);
    s3index.save(params0, function (err, result) {
      s3index.findOne({query: {_id: params0._id}, fields: fields}, function (err, result) {
        result.should.eql(params0);
        done();
      });
    });
  });

  it('List.', function (done) {

    var s3index = new S3Index(test_backet);

    s3index.save(params1, function (err, result) {
      s3index.find({query: {contentType: 'text/html'}, fields: fields}, function (err, result) {
        result.length.should.eql(1);
        result[0].should.eql(params1);
        done();
      });
    });
  });

});
