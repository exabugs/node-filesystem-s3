/**
 * node-filesystem-s3
 * @author exabugs@gmail.com
 */

"use strict";

var test_backet = 'test_backet';

var Base = require('../../lib/filesystem/s3-mongo');;

var DB = require('../../lib/db');
var fs = require('fs');
var path = require('path');
var should = require('should');


describe('Mongo', function () {

  it('Prepare.', function (done) {
    DB.initialize(function (err) {
      DB.db().collection(test_backet).drop();
      done();
    });
  });

  var fields = {
    _id: 1,
    filename: 1,
    contentType: 1
  };

  it('Insert.', function (done) {

    var base = new Base(test_backet);

    var filename = 'popy150.png';
    var filepath = path.resolve(path.join('test', 'mongo-s3', filename));
    var stream = fs.createReadStream(filepath);

    var params = {
      filename: filename,
      body: stream,
      contentType: 'image/png'
    };

    base.update(params, function (err, result) {
      var _id = result._id;
      base.findOne({query: {_id: _id}, fields: fields}, function (err, result) {

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
/*
  it('List.', function (done) {

    var base = new Base(test_backet);

    base.update(params1, function (err, result) {
      base.find({query: {contentType: 'text/html'}, fields: fields}, function (err, result) {
        result.length.should.eql(1);
        result[0].should.eql(params1);
        done();
      });
    });
  });
*/
});
