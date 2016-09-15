var _ = require('lodash');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);
var rawData = {};
var tiledMaps = {};

var CSV_DIRECTORY='../csvConverter';

module.exports = function(token) {
  console.log("Started import.");
  rr(CSV_DIRECTORY, function(err,files) {
    for (var i = 0; i < files.length; i++) {
      if ((files[i]).substr(-3) == 'csv') {
        console.log('Processing ' + files[i]);
        var options = { delimiter : ','};
        var data = fs.readFileSync(files[i], { encoding : 'utf8'});
        var jsonCsvData = csvjson.toObject(data, options);
        this.processData(jsonCsvData, files[i]);
      }
    }
    this.pushRawData(token);
    this.createAggregates([2, 3, 4, 5, 6, 7], token);
  });
};

recomputeStats = function(curStats, additionalStats) {
  if (isNaN(curStats.area)) {
    return additionalStats;
  }
  curStats.count = curStats.count + additionalStats.count;
  curStats.area.sum = curStats.area.sum + additionalStats.area.sum;
  curStats.area['sum-of-squares'] = curStats.area['sum-of-squares'] + additionalStats.area['sum-of-squares'];
  curStats.weight.sum = curStats.weight.sum + additionalStats.weight.sum;
  curStats.weight['sum-of-squares'] = curStats.weight['sum-of-squares'] + additionalStats.weight['sum-of-squares'];
  return curStats;
};

processData = function(csvJson, filename) {
  var geohash;
  // First check that all the keys are matched
  if (!('Yield Vol(Wet)(bu/ac)' in csvJson[1])) {
    if ((!'Estimated Volume (Wet)(bu/ac)' in csvJson[1])) {
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Yield Vol (Wet)(bu/ac)" nor "Estimated Volume (Wet)(bu/ac)"');
    }
  }
  if (!('Product - Name' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Product - Name" key does not exist')
  }
  if (!('Latitude' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Latitude" key does not exist')
  }
  if (!('Longitude' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Longitude" key does not exist');
  }
  if (!('Elevation(ft)' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Elevation(ft)" key does not exist')
  }
  if (!('Speed(mph)' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Speed(mph)" key does not exist');
  }
  if (!('Swath Width(ft)' in csvJson[1])) { 
    if (!('Swth Wdth(ft)' in csvJson[1])) { 
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Swath Width(ft)" nor "Swth Wdth(ft)"');
    }
  }
  if (!('Field - Name' in csvJson[1])) { 
    if (!('Field' in csvJson[1])) { 
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Field - Name" nor "Field"');
    }
  } 

  for (var i = 0; i < csvJson.length; i++) {
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    var val = +csvJson[i]['Estimated Volume (Wet)(bu/ac)'];
    if (!val) val = +csvJson[i]['Yld Vol(Wet)(bu/ac)'];
    var cropType = csvJson[i]['Product - Name'];
    cropType = cropType.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

    if (isNaN(val)) {
      console.log(csvJson[i]);
    }

    //If the geohash doesn't exist, create it;
    if (!rawData[geohash]) {

      rawData[geohash] = {
 
        _type: 'application/vnd.oada.as-harvested.wet-yield.1+json',

        context: {
          'harvest': 'as-harvested',
          'as-harvested': 'wet-yield',
          'wet-yield': 'geohash-index',
          'geohash-index': 'geohash-7',
          'geohash-7': geohash,
        },

        templates: {

        },    
  
        data: { },
      };
    }
 
    // If a template with the crop type doesn't exist, create it. Templates are named by
    // the crop type though it could also be a random string.
    if (!rawData[geohash].templates[cropType]) {
      rawData[geohash].templates[cropType] = {
        "crop-type": cropType,
        area: { units: 'acres' },
        weight: { units: 'bushels' },
        yield: { units: 'bu/ac' },
        moisture: { units: '%H2O' },
        location: { datum: 'WGS84' },
      }
    }

    // Add the data point
    var id = uuid.v4();
    rawData[geohash].data[id] = {
      id: id,
      template: cropType,
      moisture: csvJson[i]['Moisture(%)'],
      location: {
        lat: csvJson[i].Latitude,
        lon: csvJson[i].Longitude,
        alt: csvJson[i]['Elevation(ft)'],
      },
    };

    if (csvJson[i]['Swath Width(ft)']) {
      rawData[geohash].data[id].area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swath Width(ft)']/43560.0;
    } else {
      rawData[geohash].data[id].area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swth Wdth(ft)']/43560.0;
    }
    rawData[geohash].data[id].weight = val*rawData[geohash].data[id].area;

    if (isNaN(rawData[geohash].data[id].weight)) {
      console.log('````````````NEW ONE``````````');
      console.log(val);
      console.log(csvJson[i]['Speed(mph)']);
      console.log(csvJson[i]['Swath Width(ft)']);
      console.log(rawData[geohash].data[id].area);
      console.log(rawData[geohash].data[id].weight);
    }
  }
}

createAggregates = function(levels, token) {
  var i = 1;
  Object.keys(rawData).forEach((geohash) => {
    console.log(geohash, i++);
    Object.keys(rawData[geohash].data).forEach((key) => {
      levels.forEach((level) => {
        var pt = rawData[geohash].data[key];
        var weight = weight*(100-pt.moisture)/100;// Adjust weight for moisture content
        var cropType = pt.crop_type;
        var ghlen = 'geohash-'+level;
        var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
        var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
        var loc = gh.decode(aggregateGh);
        if (isNaN(pt.weight)) {
          console.log(pt);
        }
        additionalStats = {
          count: 1,
          weight: {
            sum: weight,
            'sum-of-squares': Math.pow(weight, 2)
          },
          area: {
            sum: pt.area,
            'sum-of-squares': Math.pow(pt.area, 2)
          }
        };
        tiledMaps[ghlen] = tiledMaps[ghlen] || {};
        tiledMaps[ghlen][bucketGh] = tiledMaps[ghlen][bucketGh] || {
          stats: {},
          templates: {}
        };
        if (!tiledMaps[ghlen][bucketGh].templates[cropType]) {
          rawData[geohash].templates[cropType] = {
            "crop-type": cropType,
             area: { units: 'acres' },
             weight: { units: 'bushels' },
             yield: { units: 'bu/ac' },
             moisture: { units: '%H2O' },
             location: { datum: 'WGS84' },
           }
        }
        tiledMaps[ghlen][bucketGh].stats[aggregateGh] = tiledMaps[ghlen][bucketGh].stats[aggregateGh] || {};
        // Store stats at the aggregate
        tiledMaps[ghlen][bucketGh].stats[aggregateGh][cropType] = tiledMaps[ghlen][bucketGh].stats[aggregateGh][cropType] || {};
        tiledMaps[ghlen][bucketGh].stats[aggregateGh][cropType] = recomputeStats(tiledMaps[ghlen][bucketGh].stats[aggregateGh][cropType], additionalStats);
        // Store stats at the bucket level
//        tiledMaps[ghlen][bucketGh].stats = tiledMaps[bucketGh].stats || {};
//        tiledMaps[ghlen][bucketGh].stats[cropType] = tiledMaps[bucketGh].stats[cropType] || {};
//        tiledMaps[ghlen][bucketGh].stats[cropType] = recomputeStats(tiledMaps[bucketGh].stats[cropType], additionalStats);
      });
    });
  });
  this.pushAggregates(token);
};
 
pushRawData = function(token) {
  var baseUrl = 'https://localhost:3000/bookmarks/harvest/as-harvested/yield-moisture/geohash-index/geohash-7/';
  Object.keys(rawData).forEach(function(key) {
    var resource = rawData[key];
    resource._type = 'application/vnd.oada.as-harvested.wet-yield.1+json';
    resource.context = {
      'harvest': 'tiled-maps',
      'tiled-maps': 'wet-yield',
      'wet-yield': 'geohash-index',
      'geohash-index': 'geohash-7',
      'geohash-7': key,
    };
    return agent('POST', 'https://localhost:3000/resources/')
    .set('Authorization', 'Bearer '+ token)
    .send(rawData[key])
    .end()
    // Now add a link in bookmarks
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
      return agent('PUT', baseUrl + key)
      .set('Authorization', 'Bearer ' + token)
      .send({_id: resId, _rev: '0-0'})
      .end();
    });
  })
}

pushAggregates = function(token) {
  var baseUrl = 'https://localhost:3000/bookmarks/harvest/tiled-maps/dry-yield/geohash-index/';
  Object.keys(tiledMaps).forEach(function(geohashLevel) {
    var val = tiledMaps[geohashLevel];
    Object.keys(tiledMaps[geohashLevel]).forEach(function(geohash) {
      var resource = tiledMaps[geohashLevel][geohash];
      resource._type = 'application/vnd.oada.tiled-data.dry-yield.1+json';
      resource.context = {
        'harvest': 'tiled-maps',
        'tiled-maps': 'wet-yield',
        'wet-yield': 'geohash-index',
        'geohash-index': geohashLevel,
      };
      resource.context[geohashLevel] = geohash;
      return agent('POST', 'https://localhost:3000/resources/')
      .set('Authorization', 'Bearer '+ token)
      .send(resource)
      .end()
      // Now add a link in bookmarks
      .then(function(response) {
        val.geohash = {_id: resId, _rev: '0-0'};
        var resId = response.headers.location.replace(/^\/resources\//, '');
        return agent('PUT', baseUrl + geohashLevel + '/' + geohash)
        .set('Authorization', 'Bearer ' + token)
        .send({_id: resId, _rev: '0-0'})
        .end();
      });
    })
    val._type = 'application/vnd.oada.data-index.geohash.1+json'; 
    val.context = {
      'harvest': 'tiled-maps',
      'tiled-maps': 'wet-yield',
      'wet-yield': 'geohash-index',
      'geohash-index': geohashLevel,
    };
    return agent('POST', 'https://localhost:3000/resources/')
    .set('Authorization', 'Bearer '+ token)
    .send(val)
    .end()
    // Now add a link in bookmarks
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
      return agent('PUT', baseUrl + geohashLevel + '/')
      .set('Authorization', 'Bearer ' + token)
      .send({_id: resId, _rev: '0-0'})
      .end();
    });
  })
};
