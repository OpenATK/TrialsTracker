var _ = require('lodash');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);
var tempCache = {};

module.exports = function(token) {
  rr('.', function(err,files) {
    for (var i = 0; i < files.length; i++) {
      if ((files[i]).substr(-3) == 'csv') {
        console.log('Processing ' + files[i]);
        var options = { delimiter : ','};
        var data = fs.readFileSync(files[i], { encoding : 'utf8'});
        var jsonCsvData = csvjson.toObject(data, options);
        this.processData(jsonCsvData, files[i]);
      }
    }
    this.createAggregates([2, 3, 4, 5, 6, 7], token);
  });
};

recomputeStats = function(curStats, additionalStats) {
  if (isNaN(additionalStats.sum_area)) {
    console.log('got oone');
    console.log(additionalStats);
  }
  if (isNaN(curStats.sum_area)) {
    curStats.n = additionalStats.n;
    curStats.sum_area = additionalStats.sum_area;
    curStats.sum_bushels = additionalStats.sum_bushels;
    curStats.min_yield = additionalStats.min_yield;
    curStats.max_yield = additionalStats.max_yield;
    curStats.sum_of_squares_yield = additionalStats.sum_of_squares_yield;
    curStats.mean_yield = curStats.sum_bushels/curStats.sum_area;
    return curStats;
  }
  curStats.n = curStats.n + additionalStats.n;
  curStats.sum_area = curStats.sum_area + additionalStats.sum_area;
  curStats.sum_bushels = curStats.sum_bushels + additionalStats.sum_bushels;
  if (curStats.min_yield > additionalStats.min_yield) { curStats.min_yield = additionalStats.min_yield;}
  if (curStats.max_yield < additionalStats.max_yield) { curStats.max_yield = additionalStats.max_yield;}
  curStats.mean_yield = curStats.sum_bushels/curStats.sum_area;
  curStats.sum_of_squares_yield = curStats.sum_of_squares_yield + additionalStats.sum_of_squares_yield;
  return curStats;
}

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
    if (!tempCache[geohash]) {

      tempCache[geohash] = {

        dataType: {
          definition: 'https://github.com/oada-formats',
          name: 'wet-yield',
        },

        context: {
          'geohash-7': geohash,
        },

        template: {
          Corn: {
            units: 'bu/ac',
          },
          Soybeans: {
            units: 'bu/ac',
          },
          Wheat: {
            units: 'bu/ac',
          },
        },    
  
        data: { },
      };
    }

    // Add the data point
    var id = uuid.v4();
    tempCache[geohash].data[id] = {
      field: csvJson[i]['Field - Name'],
      crop_type: cropType,
      location: {
        lat: csvJson[i].Latitude,
        lon: csvJson[i].Longitude,
        alt: csvJson[i]['Elevation(ft)'],
      },
//      time: csvJson[i]['Date / Time'],
    };
    if (!csvJson[i]['Field - Name']) {
      tempCache[geohash].data[id].field = csvJson[i]['Field'];
    }
    if (csvJson[i]['Swath Width(ft)']) {
      tempCache[geohash].data[id].area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swath Width(ft)']/43560.0;
    } else {
      tempCache[geohash].data[id].area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swth Wdth(ft)']/43560.0;
    }
    tempCache[geohash].data[id].bushels = val*tempCache[geohash].data[id].area;
    tempCache[geohash].data[id].yield = tempCache[geohash].data[id].bushels/tempCache[geohash].data[id].area;

    if (isNaN(tempCache[geohash].data[id].bushels)) {
      console.log('NEW ONE');
      console.log(val);
      console.log(csvJson[i]['Speed(mph)']);
      console.log(csvJson[i]['Swath Width(ft)']);
      console.log(tempCache[geohash].data[id].area);
      console.log(tempCache[geohash].data[id].bushels);
    }
  }
}

createAggregates = function(levels, token) {
  var i = 1;
  Object.keys(tempCache).forEach((geohash) => {
    console.log(geohash, i++);
    Object.keys(tempCache[geohash].data).forEach((key) => {
      levels.forEach((level) => {
        var pt = tempCache[geohash].data[key];
        var cropType = pt.crop_type;
        var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
        var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
        var loc = gh.decode(aggregateGh);
        if (isNaN(pt.bushels)) {
          console.log(pt);
        }
        additionalStats = {
          sum_area: pt.area,
          sum_bushels: pt.bushels, 
          n: 1,
          mean_yield: pt.bushels/pt.area,
          min_yield: pt.bushels/pt.area,
          max_yield: pt.bushels/pt.area,
          sum_of_squares_yield: Math.pow(pt.bushels/pt.area, 2),
        };
        // Create the bucket if it doesn't exist.
        tempCache[bucketGh] = tempCache[bucketGh] || {};
        // Create the aggregate key if it doesn't exist.
        tempCache[bucketGh].aggregates = tempCache[bucketGh].aggregates || {};
        // Create the aggregate geohash key if it doesn't exist (containing a stats object). 
        tempCache[bucketGh].aggregates[aggregateGh] = tempCache[bucketGh].aggregates[aggregateGh] || {
          stats:{},
          location: {
            lat: loc.latitude,
            lon: loc.longitude,
           }, 
        };
        // Store stats at the aggregate
        tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] = tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] || {};
        tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] = recomputeStats(tempCache[bucketGh].aggregates[aggregateGh].stats[cropType], additionalStats);
        // Store stats at the bucket level
        tempCache[bucketGh].stats = tempCache[bucketGh].stats || {};
        tempCache[bucketGh].stats[cropType] = tempCache[bucketGh].stats[cropType] || {};
        tempCache[bucketGh].stats[cropType] = recomputeStats(tempCache[bucketGh].stats[cropType], additionalStats);
      });
    });
  });
  this.pushAggregates(token);
}

pushAggregates = function(token) {
  var baseUrl = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-';
  var aggregateKeys = Object.keys(tempCache);
  var k = 1;
// Post each geohash resource
  Promise.each(aggregateKeys, function(key) {
    console.log(key, k++);
//    if (k < 746) return null;
    console.log(tempCache[key]);
    return agent('POST', 'https://localhost:3000/resources/')
    .set('Authorization', 'Bearer '+ token)
    .send(tempCache[key])
    .end()
// Then, add a link in /resources
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
      return agent('PUT', baseUrl + key.length+'/'+key)
      .set('Authorization', 'Bearer ' + token)
      .send({_id: resId, _rev: '0-0'})
      .end();
    });
  })
}
