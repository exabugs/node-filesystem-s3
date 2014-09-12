/**
 * Created by DA on 2014/09/12.
 */
"use strict";

var vm = require('vm');
var fs = require('fs');
var path = require('path');
var should = require('should');
var async = require('async');

// See http://nazomikan.hateblo.jp/entry/2013/04/10/032410
// original http://howtonode.org/testing-private-state-and-mocking-deps
/**
 * Helper for unit testing:
 * - load module with mocked dependencies
 * - allow accessing private state of the module
 *
 * @param {string} filePath Absolute path to module (file to load)
 * @param {Object=} mocks Hash of mocked dependencies
 */
function loadModule(filePath, mocks, done) {
  mocks = mocks || {};

  // this is necessary to allow relative path modules within loaded file
  // i.e. requiring ./some inside file /a/b.js needs to be resolved to /a/some
  var resolveModule = function (module) {
    if (module.charAt(0) !== '.') return module;
    return path.resolve(path.dirname(filePath), module);
  };

  var exports = {};
  var context = {
    require: function (name) {
      return mocks[name] || require(resolveModule(name));
    },
    console: console,
    exports: exports,
    module: {
      exports: exports
    }
  };

  vm.runInNewContext(fs.readFileSync(filePath), context);
  done(null, context);
}

function init(done) {
  var modulePath = __dirname.replace(/test\/private/, 'lib/base/base.js');
  done(null, modulePath, undefined);
}

describe("Start.", function () {

  var BaseContext;

  it('prepare', function (next) {

      async.waterfall([init, loadModule], function (err, context) {

        should.equal(err, null);

        BaseContext = context;
        next();
      });
    }
  );

  it('case1. addDefault to empty', function (next) {

    var params = {};
    BaseContext._addDefaultSort(params);

    (isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function(sort, _next){

      (isArray(sort)).should.be.true;
      (sort.length === 2).should.be.true;
      (sort[0] === '_id' && sort[1] === -1).should.be.true;

      _next();
    })

    next();
  })

  it('case2. addDefault to exist', function (next) {

    var params = {sort: []};
    BaseContext._addDefaultSort(params);

    (isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function(sort, _next){

      (isArray(sort)).should.be.true;
      (sort.length === 2).should.be.true;
      (sort[0] === '_id' && sort[1] === -1).should.be.true;

      _next();
    })
    next();
  })
});

function isArray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}