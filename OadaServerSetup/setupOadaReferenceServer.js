var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);
var uuid = require('uuid');
var levels = [2, 3, 4, 5, 6, 7];

module.exports = function(token) {

  levels.forEach(function(lvl) {
    //Create the resources
    var meta = {
      _mediaType: 'application/vnd.oada.yield.1+json',
    };
    var id = uuid.v4();
    resourceData = {
      _id: id
    };

    return agent.put('/'+id, resourceData)
    .set('Authorization', 'Bearer '+ token)
    .end()
    .then(function onResult(response) {
      //Create the bookmarks
      var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-'+lvl+'/';
      bookmarkData = {};
      bookmarkData['geohash-'+lvl] = {
        _id: id, 
        _rev: ''
      }
      return agent.put(url, bookmarkData)
      .set('Authorization', 'Bearer '+ token)
      .end()
      .then(function onResult(response) {
      }, function onError(response) {

      });
    }, function onError(response) {

    });
  })
}
