var toGeoJSON = require('togeojson'),
    fs = require('fs'),
    jsdom = require('jsdom').jsdom,
    Promise = require('bluebird').Promise,
    agent = require('superagent-promise')(require('superagent'), Promise),
    token = '',
    uuid = require('uuid');
 
exports.createOadaFields = function() {
  //Create the fields resource and get the id 
  new Promise(function() {
    return agent('PUT', 'https://localhost:3000/resources/')
    .set('Authorization', 'Bearer '+ token)
    .send()
    .end()
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
    })
  });
  //Create the grower resource and get the id 
  new Promise(function() {
    return agent('PUT', 'https://localhost:3000/resources/')
    .set('Authorization', 'Bearer '+ token)
    .send()
    .end()
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
    })
  });


  var kml = jsdom(fs.readFileSync('AultFarmsFields.kml', 'utf8'));
  var kmlFile = toGeoJSON.kml(kml);

  var fields = [];
  kmlFile.features.forEach(function(feature) {
//    console.log(feature.properties.name);
//    console.log(feature.properties.name.split(/\d+/g, 1));

    // Parse farm and field names
    if (feature.properties.name.includes(' - ')) {
      var farmName = feature.properties.name.split(' - ', 1)[0];
      var fieldName = feature.properties.name.split(' - ', 2)[1];
    } else {
    //TODO: Later, make an attempt at identifying the undefined farms.
    //Unfortunately, there are no consistent patterns.
      var farmName = 'undefined';
      var fieldName = feature.properties.name;
    }
    // Post the farm if it is new. 
    return new Promise(function() {
      return agent('POST', 'https://localhost:3000/resources/')
      .set('Authorization', 'Bearer '+ token)
      .send()
      .end()
    
      .then(function(response) {
        var resId = response.headers.location.replace(/^\/resources\//, '');
        return agent('PUT', baseUrl + farm + '/fields/' + fieldName)
        .set('Authorization', 'Bearer ' + token)
        .send({_id: resId, _rev: '0-0'})
        .end();
      });
    })   
    
    var field = {
      _type: 'applications/vnd/oada.field.1+json'
      name: name,
      context: {
        grower: {_id: ''},
        farm: {_id: ''},
      },
      boundary: {
        geojson: {}
      };
    });

    baseUrl = 'https://localhost:3000/bookmarks/fields/Grower/Ault/Farm/',

  });
}

pushFields = function() {
  baseUrl = 'https://localhost:3000/bookmarks/fields/Grower/Ault/Farm/',
  keys = Object.keys(fields);
  Promise.each(keys, function(key) {
    console.log(keys[key]);
    return agent('POST', 'https://localhost:3000/resources')
    .set('Authorization', 'Bearer '+ token)
    .send(fields[key])
    .end()
    
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
      return agent('PUT', baseUrl + farm + '/fields/' + fieldName)
      .set('Authorization', 'Bearer ' + token)
      .send({_id: resId, _rev: '0-0'})
      .end();
    });
  })
}
