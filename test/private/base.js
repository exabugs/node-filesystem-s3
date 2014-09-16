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

var BaseContext;

describe("Start.", function () {

  it('prepare', function (next) {

      async.waterfall([init, loadModule], function (err, context) {

        should.equal(err, null);

        BaseContext = context;
        next();
      });
    }
  );

  // paramsにsortキーが存在しない
  it('case1. addDefault to empty object', function (next) {

    var params = {};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);

      _next();
    })

    next();
  })

  // paramsにsortキーが存在するが値が空配列
  it('case2. addDefault to object(sort key and empty array)', function (next) {

    var params = {sort: []};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);

      _next();
    })
    next();
  })

  // paramsにsortキーが存在するが値がnull
  it('case3. addDefault to object(sort key and null)', function (next) {

    var params = {sort: null};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);

      _next();
    })
    next();
  })

  // paramsにsortキーが存在するが値がundefined
  it('case4. addDefault to object(sort key and undefined)', function (next) {

    var params = {sort: undefined};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);

      _next();
    })
    next();
  })

  // paramsにsortキーが存在するが値がundefined
  it('case5. addDefault to object(sort key and object)', function (next) {

    var params = {sort: {}};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);

      _next();
    })
    next();
  })

  // paramsにsortキーが存在するが値がundefined
  it('case6. addDefault to object(sort key and function)', function (next) {

    var params = {sort: function () {
    }};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);
      _next();
    })
    next();
  })

  // paramsにsortキーが存在するが値がundefined
  it('case7. addDefault to object(sort key and sortParam)', function (next) {

    var sortKey = 'aaa'
      , sortOrder = 1;

    var params = {sort: [
      [sortKey, sortOrder]
    ]};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 2).should.be.true;

    var i = 0;
    var length = params.sort.length;
    async.each(params.sort, function (sort, _next) {

      i++;
      isSortParam(sort);

      if (i < length) {

        equalSortParam(sort, sortKey, sortOrder);

      } else {

        // default check
        equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);
      }
      _next();
    })
    next();
  })

  // paramsにsortキー、sortParamが存在しかつデフォルトソート(デフォルトソートは重複しない）
  it('case8. addDefault to object(sort key and defaultSort)', function (next) {

    var sortKey = BaseContext.SORT_KEY
      , sortOrder = BaseContext.SORT_ORDER;

    var params = {sort: [
      [sortKey, sortOrder]
    ]};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);
      _next();
    })
    next();
  })

  // paramsにsortキー、sortParamがArrayじゃない
  it('case9. addDefault to object(sort key and invalid SortParam: empty Object)', function (next) {

    var params = {sort: [
      {}
    ]};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);
      _next();
    })
    next();
  })

  // paramsにsortキー、sortParamのArray.lengthが > 2
  it('case10. addDefault to object(sort key and invalid SortParam: Array size)', function (next) {

    var params = {sort: [
      [1,2,3]
    ]};
    BaseContext._addDefaultSort(params);

    (BaseContext.Base.prototype.isArray(params.sort)).should.be.true;
    (params.sort.length === 1).should.be.true;

    async.each(params.sort, function (sort, _next) {

      isSortParam(sort);
      equalSortParam(sort, BaseContext.SORT_KEY, BaseContext.SORT_ORDER);
      _next();
    })
    next();
  })
});

/*
SortParam is must be type Array and length == 2
 */
function isSortParam(sort) {

  (BaseContext.Base.prototype.isArray(sort)).should.be.true;
  (sort.length === 2).should.be.true;
}

function equalSortParam(sort, expectKey, expectOrder) {

  (sort[0] === expectKey && sort[1] === expectOrder).should.be.true;
}