/*
 *
 */

var express = require('express');
var router = express.Router();

var fs = require('../lib/filesystem/s3');

/**
 *
 */
router.get('/:id/video/', function (req, res) {
  fs.getIndex({Key: req.params.id}, function (err, index) {
    res.render('video', {title: 'YourTube', name: index.filename});
  });
});

/**
 * クラウドフロントにリダイレクトする
 * m3u8の場合は直接返す。
 */
router.get('/:id/video/:dir/:file', function (req, res) {
  var params = req.params;
  var id = [params.id, params.dir].join('/');
  var file = params.file;
  fs.play_video(id, file, res);
});

/**
 *
 */
router.get('/:id/video/:file', function (req, res) {
  var params = req.params;
  var id = params.id;
  var file = params.file;
  fs.play_video(id, file, res);
});

module.exports = router;
