/*
 *
 */

var express = require('express');
var router = express.Router();

var fs = require('../lib/filesystem/s3');

/**
 * 署名付きURL(アップロード用)
 *
 * ex.
 * curl  -X PUT -H 'Content-Type: image/png' -v --upload-file popy150.png "https://hoge.s3.amazonaws.com/....."
 *
 * expires       : null or seconds      (default) 1 seconds
 * content_type  : null or <type>       (default) binary/octet-stream
 * key           : null or ObjectID     (default) new Key
 * method        : 'GET' or 'PUT'       (default) PUT
 */
router.get('/getSignedUrl', function (req, res) {
  fs.getSignedUrl(req.query, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

router.delete('/:id', function (req, res) {
  fs.del(req.params, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

router.put('/:id', function (req, res) {
  fs.put(req.params, req.body, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

/**
 *  GET files listing.
 */
router.get('/list', function (req, res) {
  res.render('files', { title: 'YourTube' });
});

router.get('/', function (req, res) {
  fs.list(req.query, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

router.get('/:id', function (req, res) {
  fs.get(req, res);
});

/**
 * 後処理
 *
 * ETagなどのメタ情報をS3から取得して保管する
 * 動画の場合はエンコードジョブの投入
 *
 * id : ObjectID
 */
router.get('/aftertreat/:id', function (req, res) {
  fs.aftertreat(req.params, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

/**
 * ただ自分自身に上書きするテスト
 */
router.get('/update_test/:id', function (req, res) {
  fs.update_test(req.params.id, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

module.exports = router;
