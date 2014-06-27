

var PipelineId = '1401168325038-nrmdw2';
var MovieBucket = 'dreamarts-cloud-doo-test.movie';

exports.play_video = function (id, file, res) {
  var key = [id, file].join('/');
  var ext = path.extname(file);
  var suffix = {'.m3u8': 1};
  if (suffix[ext]) {
    send_direct({Bucket: MovieBucket, Key: key}, res, null, function (err, result) {
    });
  } else {
    getSignedURL2({host: cf_movie, key: key}, function (err, result) {
      if (err) {
        res.send(err);
      } else {
        redirect(res, result.url);
      }
    });
  }
};


/**
 * 後処理
 *
 * ETagなどのメタ情報をS3から取得して保管する
 * 動画の場合はエンコードジョブの投入
 *
 * id : ObjectID
 */
exports.aftertreat = function(params, callback) {

  Key = params.id;

  // S3 → MongoDB
  updateMetaInfo(Key, callback);

  getIndex({Key: Key}, function (err, index) {
    if (err || !index) {
      callback(err);
    }
    var type = index.contentType || '';

    // 動画エンコード
    if (type.indexOf('video/') === 0) {
      var transcoder = new AWS.ElasticTranscoder({apiVersion: '2012-09-25'});
      var options = {
        PipelineId: PipelineId,
        Input: {
          Key: Key
        },
        OutputKeyPrefix: Key + '/',
        Outputs: [
          {
            PresetId: '1401553572423-strh6i', // MP4 360p 16:9
            Key: 'data.mp4',
            ThumbnailPattern: 'thumbnail/{count}',
            Watermarks: [
              {
                InputKey: 'popy150.png',
                PresetWatermarkId: 'TopLeft'
              },
              {
                InputKey: 'MP4_0480p.png',
                PresetWatermarkId: 'TopRight'
              }
            ]
          },
          {
            PresetId: '1401553215805-kac4dq', // HLS 400k
            Key: 'HLS_0400K/data',
            SegmentDuration: "10",
            Watermarks: [
              {
                InputKey: 'popy150.png',
                PresetWatermarkId: 'TopLeft'
              },
              {
                InputKey: 'HLS_0400k.png',
                PresetWatermarkId: 'TopRight'
              }
            ]
          },
          {
            PresetId: '1401553359605-zgqx0x', // HLS 1,000k
            Key: 'HLS_1000K/data',
            SegmentDuration: "10",
            Watermarks: [
              {
                InputKey: 'popy150.png',
                PresetWatermarkId: 'TopLeft'
              },
              {
                InputKey: 'HLS_1000k.png',
                PresetWatermarkId: 'TopRight'
              }
            ]
          },
          {
            PresetId: '1401553476835-6b99s4', // HLS 2,000k
            Key: 'HLS_2000K/data',
            SegmentDuration: "10",
            Watermarks: [
              {
                InputKey: 'popy150.png',
                PresetWatermarkId: 'TopLeft'
              },
              {
                InputKey: 'HLS_2000k.png',
                PresetWatermarkId: 'TopRight'
              }
            ]
          },
          {
            PresetId: '1401624233970-fot17o', // HLS 100k
            Key: 'HLS_0100K/data',
            SegmentDuration: "10",
            Watermarks: [
              {
                InputKey: 'popy150.png',
                PresetWatermarkId: 'TopLeft'
              },
              {
                InputKey: 'HLS_0100k.png',
                PresetWatermarkId: 'TopRight'
              }
            ]
          }
        ],
        Playlists: [
          {
            Format: 'HLSv3',
            Name: 'data',
            OutputKeys: [
              'HLS_2000K/data',
              'HLS_1000K/data',
              'HLS_0400K/data',
              'HLS_0100K/data'
            ]
          }
        ]
      };
      transcoder.createJob(options, function (err, data) {
        callback(err, data);
      })
    }
  });
};
function cache_control(object) {
  var params = [];
  if (object) {
    if (object.proxy_revalidate) {
      params.push('proxy-revalidate'); // キャッシュしたレスポンスの有効性の再確認を要求
    }
    if (object.must_revalidate) {
      params.push('must-revalidate'); // キャッシュ可能であるが、オリジンサーバーにリソースの再確認を要求する
    }
    if (object.no_cache) {
      params.push('no-cache'); // 有効性の再確認なしではキャッシュは使用してはならない
    }
    if (object.no_store) {
      params.push('no-store'); // キャッシュはリクエスト、レスポンスの一部分を保存してはならない
    }
    if (object.no_transform) {
      params.push('no-transform'); // プロキシはメディアタイプを変換してはならない
    }
    if (object.public) {
      params.push('public'); // どこかにレスポンスキャッシュが可能
    }
    if (object.private) {
      params.push('private'); // 特定ユーザーに対してのみレスポンス
    }
    if (object.max_age) {
      params.push('max-age=' + 20); // レスポンスの最大Age値
    }
  }
  return params.join(',');
}