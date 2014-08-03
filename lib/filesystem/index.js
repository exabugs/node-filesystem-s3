// 工事中

S3FS.prototype.put = function (params, body, callback) {
  var values = {};

  checkbox(values, 'direct', body['direct']);

  checkbox(values, 'cache.public', body['public']);
  checkbox(values, 'cache.private', body['private']);
  checkbox(values, 'cache.no_cache', body['no_cache']);
  checkbox(values, 'cache.no_store', body['no_store']);
  checkbox(values, 'cache.no_transform', body['no_transform']);
  checkbox(values, 'cache.proxy_revalidate', body['proxy_revalidate']);
  checkbox(values, 'cache.must_revalidate', body['must_revalidate']);
  checkbox(values, 'cache.max_age', body['max_age']);

  this.putIndex(params.id, values, function (err, result) {
    callback(err, result);
  });

  // MongoDB → S3
  this.reverseUpdateMetaInfo(params.id, function (err, result) {
  });

};

function checkbox(values, name, value) {
  if (value !== undefined) {
    values[name] = (value === 'true') ? true : false;
  }
}

S3FS.prototype.list = function (params, callback) {
  DB.open(function (err, db) {
    if (err) {
      callback(err);
    } else {
      var collection = db.collection(collection_name);
      var condition = {deleted_at: {$exists: false}};
      collection.find(condition).count(function (err, iTotalRecords) {
        if (params.sSearch) {
          condition['$or'] = [
            {filename: new RegExp(params.sSearch)},
            {contentType: new RegExp(params.sSearch)}
          ]
        }
        collection.find(condition).count(function (err, iTotalDisplayRecords) {
          var sort = [];
          if (params.iSortCol_0) {
            sort.push([params['mDataProp_' + params.iSortCol_0], params.sSortDir_0]);
          }
          var option = {
            sort: sort,
            limit: params.iDisplayLength,
            skip: params.iDisplayStart
          };
          collection.find(condition, option).toArray(function (err, results) {
            db.close();
            callback(null, {
              items: results,
              iTotalRecords: iTotalRecords,
              iTotalDisplayRecords: iTotalDisplayRecords
            });
          });
        });
      });
    }
  });
};


S3FS.prototype.get = function (req, res) {
  var key = req.params.id;

  // todo: チェック
  check();

  var info = {Bucket: Bucket, Key: key};
  getIndex(info, function (err, index) {

    if (index.direct) {
      // ローカル配送
      var ims = req.headers['if-modified-since'];
      var uld = index.uploadDate;

      var moment_ims = moment(ims).unix();
      var moment_uld = moment(uld).unix();

      if (ims && uld && moment_uld == moment_ims) {
        res.removeHeader('Cache-Control');
        res.send(304); // Not Modified.
      } else {
        send_direct(info, res, index, function (err, result) {
        });
      }
    } else {
      //CloudFront配送
      getSignedURL2({host: cf_files, key: key}, function (err, result) {
        if (err) {
          res.send(err);
        } else {
          redirect(res, result.url);
        }
      });
    }
  });
};

/**
 * S3オブジェクトを送信する
 * @param params {Bucket: xxx, Key: xxx}
 * @param res
 * @param maxAge キャッシュ有効期間(sec)
 * @param callback
 */
exports.send_direct = function (params, res, index, callback) {
  var s3 = new AWS.S3();
  s3.getObject(params, function (err, data) {
    if (err) {
      res.send(err);
    } else {
      var header = {'Content-Type': data.ContentType};
      if (index) {
        //header['Cache-Control'] = cache_control(index.cache);
        if (index.uploadDate) {
          // UTCで返すこと
          header['Last-Modified'] = index.uploadDate.toUTCString();
        }
      }
      res.writeHead(200, header);
      res.write(data.Body);
      res.end();
    }
    callback(err, data);
  });
};
