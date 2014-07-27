/**
 * node-filesystem-s3
 * @author exabugs@gmail.com
 */

"use strict";

var test_backet = 'test_backet';

var S3 = require('../../lib/filesystem/s3-native');
var fs = require('fs');
var path = require('path');
var should = require('should');

describe('Native', function () {

  it('Prepare bucket.', function (done) {

    var finish = false;
    var s3 = new S3(test_backet);
    s3.deleteBucket(function (err, data) {
      s3.createBucket(function (err, data) {
        if (!finish) {
          done();
          finish = true;
        }
      });
    });

  });

  /**
   * バッファ(オンメモリ)をS3に書込
   * バッファ(オンメモリ)でS3から取得
   */
  it('Write & Read (String)', function (done) {

    var fs = new S3(test_backet);
    var id = '0001';
    var text = 'Hello World';
    var type = 'text/plain';

    fs.write(id, text, type, null, function (err, data) {
      fs.read(id, function (err, data) {
        var a0 = text;
        var a1 = data.Body.toString();
        should.equal(a0, a1);
        done();
      });
    });

  });

  /**
   * ローカルファイル(ストリーム)をS3に書込
   * バッファ(オンメモリ)でS3から取得
   */
  it('Write & Read (File: Buffer)', function (done) {

    var s3 = new S3(test_backet);
    var id = '0002';
    var file = 'popy150.png';
    var filepath = path.resolve(path.join('test', 'native', file));
    var stream = fs.createReadStream(filepath);
    var type = 'image/png';

    s3.write(id, stream, type, file, function (err, data) {
      s3.read(id, function (err, data) {
        var a0 = fs.readFileSync(filepath).toString('base64');
        var a1 = data.Body.toString('base64');
        should.equal(a0, a1);
        done();
      });
    });

  });

  /**
   * ローカルファイル(ストリーム)をS3に書込
   * ストリームでS3から取得
   * (ローカルファイルを生成して比較)
   */
  it('Write & Read (File: ReadStream)', function (done) {

    var s3 = new S3(test_backet);
    var id = '0003';
    var file = 'popy150.png';
    var filepath0 = path.resolve(path.join('test', 'native', file));
    var stream = fs.createReadStream(filepath0);
    var type = 'image/png';

    s3.write(id, stream, type, file, function (err, data) {

      // ストリーム処理が面倒なので一度ファイルに受ける
      var filepath1 = path.resolve(path.join('logs', file));
      var ws = fs.createWriteStream(filepath1);
      s3.createReadStream(id, function (err, rs) {

        rs.pipe(ws);

        ws.on('close', function () {
          var a0 = fs.readFileSync(filepath0).toString('base64');
          var a1 = fs.readFileSync(filepath1).toString('base64');
          should.equal(a0, a1);
          done();
        });

      });

    });

  });
  /**
   * ファイル削除
   */
  it('Delete', function (done) {
    var s3 = new S3(test_backet);
    s3.destroy('0001', function () {
      s3.destroy('0002', function () {
        s3.destroy('0003', function () {
          done();
        });
      });
    });
  });

  /**
   * ヘッダ情報
   * サイズ
   * Content-Type
   */
  it('Write & Read (File: ReadStream)', function (done) {

    var s3 = new S3(test_backet);
    var id = '0003';
    var file = 'popy150.png';
    var filepath = path.resolve(path.join('test', 'native', file));
    var stream = fs.createReadStream(filepath);
    var type = 'image/png';

    s3.write(id, stream, type, file, function (err, data) {
      s3.getInfo(id, function (err, info) {
        var stat = fs.statSync(filepath);
        should(info.ContentLength, stat.size);
        should.equal(info.ContentType, type);
        done();
      });
    });
  });

});
