



/**
 * 論理削除
 * @param params
 * @param callback
 * todo: extendsできるように
 */
Base.prototype.delete = function (params, callback) {
  var values = {deleted_at: new Date()};
  this.findAndModify(params.id, values, callback);
};


/**
 * 論理削除
 * todo: extendsできるように
 */
function paranoia() {

  // delete : 2
  var values = {deleted_at: new Date()};

  // cancel delete : 1


  // search 'not delete' : 1
  condition['deleted_at'] = {$exists: false};

  // search 'delete' : 2

  // search both : 3

}
