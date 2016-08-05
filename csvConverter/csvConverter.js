var _ = require('lodash');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
var agent = require('superagent-promise')(require('superagent'), Promise);
var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/';
var token = 'TsHYJD2VvZAGwxxiKir5vdGyUet5U0D3pbgJWgar';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);
var tempCache = {};

exports.csvToOadaYield = function() {
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
    this.createAggregates([2, 3, 4, 5, 6, 7]);
  });
};

recomputeStats = function(curStats, additionalStats) {
  if (isNaN(curStats.sum_of_squares)) {
    curStats.sum_of_squares = additionalStats.sum_of_squares;
    curStats.n = additionalStats.n;
    curStats.sum = additionalStats.sum;
    curStats.mean = curStats.sum/curStats.n;
    curStats.min = additionalStats.min;
    curStats.max = additionalStats.max;
    return curStats;
  }
  curStats.sum_of_squares = curStats.sum_of_squares + additionalStats.sum_of_squares;
  curStats.n = curStats.n + additionalStats.n;
  curStats.sum = curStats.sum + additionalStats.sum;
  curStats.mean = curStats.sum/curStats.n;
  if (curStats.min > additionalStats.min) { curStats.min = additionalStats.min;}
  if (curStats.max < additionalStats.max) { curStats.max = additionalStats.max;}

  return curStats;
}

processData = function(csvJson, filename) {
  var geohash;
  for (var i = 0; i < csvJson.length; i++) {
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    var val = +csvJson[i]['Estimated Volume (Wet)(bu/ac)'];
    var cropType = csvJson[i]['Product - Name'];
    cropType = cropType.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

    if (!val) val = +csvJson[i]['Yld Vol(Wet)(bu/ac)'];
    if (!val) console.log(csvJson[i], val);

    //If the geohash doesn't exist, create it;
    if (!tempCache[geohash]) {

      tempCache[geohash] = {

       /* _id: uuid.v4(),
        _rev: '1-'+uuid.v4(),
        _type: 'yield data. not sure what belongs here',
        _meta: {},
*/
        dataType: {
          definition: 'https://github.com/oada-formats',
          name: 'wet-yield',
        },

        context: {
          'geohash-7': geohash,
        },
//TODO: populate these dynamically. If a crop type is encountered it, add it as a template present in this dataset

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
/*
      tempCache[geohash].stats[cropType] = {
        n: 1,
        sum: val,
        mean: val,
        min: val,
        max: val,
        sum_of_squares: Math.pow(val,2),
      };
// If the geohash exists, but a new crop is encountered, begin storing stats for the new crop type
    } else if(!tempCache[geohash].stats[cropType]) {

      tempCache[geohash].stats[cropType] = {
        n: 1,
        sum: val,
        mean: val,
        min: val,
        max: val,
        sum_of_squares: Math.pow(val,2),
      };

// Else, both the geohash and the crop type exist. Append to it and recompute stats, else create it.
    } else {

      additionalStats = {
        n: 1,
        sum: val,
        mean: val,
        min: val,
        max: val,
        sum_of_squares: Math.pow(val,2),
      };

      tempCache[geohash].stats[cropType] = recomputeStats(tempCache[geohash].stats[cropType], additionalStats);
    }
*/

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
//      value: val,
      area: (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swath Width(ft)']/43560.0,
//      time: csvJson[i]['Date / Time'],
    };
    tempCache[geohash].data[id].bushels = csvJson[i]['Estimated Volume (Wet)(bu/ac)']*tempCache[geohash].data[id].area;
  }
}

createAggregates = function(levels) {
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
        additionalStats = {
          n: 1,
          sum: pt.value,
          mean: pt.value,
          min: pt.value,
          max: pt.value,
          sum_of_squares: Math.pow(pt.value,2),
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
        // Create the cropType key if it doesn't exist and recompute stats.
        tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] = tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] || {};
        tempCache[bucketGh].aggregates[aggregateGh].stats[cropType] = recomputeStats(tempCache[bucketGh].aggregates[aggregateGh].stats[cropType], additionalStats);
        // Create a stats object at the bucket level and recompute stats.
        tempCache[bucketGh].stats = tempCache[bucketGh].stats || {};
        tempCache[bucketGh].stats[cropType] = tempCache[bucketGh].stats[cropType] || {};
        tempCache[bucketGh].stats[cropType] = recomputeStats(tempCache[bucketGh].stats[cropType], additionalStats);

// Also store overall stats of all data points contained at the bucket geohash level, broken down into keyed crop types.
//        tempCache[bucketGh].aggregates.stats[cropType] = tempCache[bucketGh].aggregates.stats[cropType] || {};
//        tempCache[bucketGh].aggregates.stats[cropType] = recomputeStats(tempCache[bucketGh].aggregates.stats[cropType], additionalStats);
// Also store overall stats of all data points contained at the bucket geohash level;
//        tempCache[bucketGh].stats = recomputeStats(tempCache[bucketGh].aggregates.stats, additionalStats);
      });
    });
  });
  Object.keys(tempCache).forEach((geohash) => {
    var bucketGh = geohash;
    Object.keys(tempCache[geohash].aggregates).forEach((key) => {
      var aggregateGh = key;
      tempCache[bucketGh].aggregates_stats = tempCache[bucketGh].aggregates_stats || {};
      tempCache[bucketGh].aggregates_stats.num_aggregates = tempCache[bucketGh].aggregates_stats.num_aggregates || 0;
      tempCache[bucketGh].aggregates_stats.num_aggregates++;
      Object.keys(tempCache[geohash].aggregates[key].stats).forEach((cropType) => {
        tempCache[bucketGh].aggregates_stats.sum_n = tempCache[bucketGh].aggregates_stats.sum_n + tempCache[bucketGh].aggregates[key].stats[cropType].n || tempCache[bucketGh].aggregates[key].stats[cropType].n;
        tempCache[bucketGh].aggregates_stats.min_n = tempCache[bucketGh].aggregates_stats.min_n || tempCache[bucketGh].aggregates[key].stats[cropType].n;
        tempCache[bucketGh].aggregates_stats.max_n = tempCache[bucketGh].aggregates_stats.max_n || tempCache[bucketGh].aggregates[key].stats[cropType].n;
        if (tempCache[bucketGh].aggregates[key].stats[cropType].n > tempCache[bucketGh].aggregates_stats.max_n) {
          tempCache[bucketGh].aggregates_stats.max_n = tempCache[bucketGh].aggregates[key].stats[cropType].n;
        }
        if (tempCache[bucketGh].aggregates[key].stats[cropType].n < tempCache[bucketGh].aggregates_stats.min_n) {
          tempCache[bucketGh].aggregates_stats.min_n = tempCache[bucketGh].aggregates[key].stats[cropType].n;
        }
        tempCache[bucketGh].aggregates_stats.mean_n = (tempCache[bucketGh].aggregates_stats.sum_n)/(tempCache[bucketGh].aggregates_stats.num_aggregates);
      });
    });
  });
  this.pushAggregates();
}

pushAggregates = function() {
  var baseUrl = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-';
  var aggregateKeys = Object.keys(tempCache);
  var k = 1;
// Post each geohash resource
  Promise.each(aggregateKeys, function(key) {
    console.log(key, k++);
    if (k < 746) return null;
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

pushData = function() {
  var self = this;
  var cacheKeys = Object.keys(tempCache);
  var k = 1;
  Promise.each(cacheKeys, function(key) {
    console.log(key, k++);
    var geohash = tempCache[key];
    if (!geohash) { 
      console.log(key);
      return false;
    }
// Attempt to get the geohash.
    return agent('GET', url+key)
      .set('Authorization', 'Bearer '+ token)
      .end()
// Success: update the stats 
      .then(function onResult(response) {
//        console.log('Updating existing geohash');
//        console.log(response.body);
        var newStats = self.recomputeStats(response.body.stats, geohash.stats);
        return agent('PUT', url+key+'/stats/')
          .set('Authorization', 'Bearer '+ token)
          .send(newStats)
          .end();
      })
// Failure: Post the geohash resource omitting the data
      .catch((e) => e.response && e.response.res.statusCode === 404, function() {
        var tmp = _.omit(geohash, 'data');
        return agent('POST', 'https://localhost:3000/resources/')
          .set('Authorization', 'Bearer '+ token)
          .send(tmp)
          .end()
//Now, add a link in /resources
          .then(function(response) {
            var resId = response.headers.location.replace(/^\/resources\//, '');
            return agent('PUT', url + key)
              .set('Authorization', 'Bearer ' + token)
              .send({_id: resId, _rev: '0-0'})
              .end();
          });

      })
// Now add the data regardless
    .then(function() {
      return agent('PUT', url+key+'/data/')
        .set('Authorization', 'Bearer '+ token)
        .send(geohash.data)
        .end();     
    });
  })
  .catch(function (e) {
    console.log('Bad error');
    console.log(filename);
    console.log(e);
    throw e;
  });
}
