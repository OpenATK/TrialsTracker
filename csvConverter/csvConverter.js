var _ = require('lodash');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
var agent = require('superagent-promise')(require('superagent'), Promise);
var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/';
var token = 'HVXdG8m5B8dO3OmV6DwjgWs1fMPYCs-CsThy_N36';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);
var tempCache = {};

exports.csvToOadaYield = function() {
  rr('.', function(err,files) {
    for (var i = 0; i < files.length; i++) {
      if ((files[i]).substr(-3) == 'csv') {
        console.log('Processing ' + files[i]);
        var dataArray = csvjson.toObject(files[i]).output;
        this.processData(dataArray, files[i]);
      }
    }
    this.createAggregates([2, 3, 4, 5, 6, 7]);
//    this.pushData();
  });
};

recomputeStats = function(curStats, additionalStats) {
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
    if (!val) val = +csvJson[i]['Yld Vol(Wet)(bu/ac)'];
    if (!val) console.log(csvJson[i], val);
    //If the geohash exists, append to it and recompute stats, else create it.
    if (tempCache[geohash]) {
      additionalStats = {
        n: 1,
        sum: val,
        mean: val,
        min: val,
        max: val,
        sum_of_squares: Math.pow(val,2),
      };
//      console.log(additionalStats);
      tempCache[geohash].stats = recomputeStats(tempCache[geohash].stats, additionalStats);
    } else {
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

        stats: {
          n: 1,
          sum: val,
          mean: val,
          min: val,
          max: val,
          sum_of_squares: Math.pow(val,2),
        },
   
        template: {
          '1': {
            sensor: { id: 'Tractor or sensor reference here?'},
            units: 'bu/ac',
          },
        },    
  
        data: {},
      };
    }
    // Add the data point
    tempCache[geohash].data[uuid.v4()] = {
      location: {
        lat: csvJson[i].Latitude,
        lon: csvJson[i].Longitude,
        alt: csvJson[i]['Elevation(ft)'],
      },
      value: val,
      time: csvJson[i]['Date / Time'],
    };
  }
}

createAggregates = function(levels) {
  var i = 1;
  Object.keys(tempCache).forEach((geohash) => {
    console.log(geohash, i++);
    Object.keys(tempCache[geohash].data).forEach((key) => {
      levels.forEach((level) => {
        var pt = tempCache[geohash].data[key];
        var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
        var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
        tempCache[bucketGh] = tempCache[bucketGh] || {};
        tempCache[bucketGh].aggregates = tempCache[bucketGh].aggregates || {};
        additionalStats = {
          n: 1,
          sum: pt.value,
          mean: pt.value,
          min: pt.value,
          max: pt.value,
          sum_of_squares: Math.pow(pt.value,2),
        };
        var loc = gh.decode(aggregateGh);
        tempCache[bucketGh].aggregates[aggregateGh] = tempCache[bucketGh].aggregates[aggregateGh] || {
          location: {
            lat: loc.latitude,
            lon: loc.longitude,
          },
          stats: {
            n: 1,
            sum: pt.value,
            mean: pt.value,
            min: pt.value,
            max: pt.value,
            sum_of_squares: Math.pow(pt.value,2),
          },
        };
        tempCache[bucketGh].aggregates[aggregateGh].stats = recomputeStats(tempCache[bucketGh].aggregates[aggregateGh].stats, additionalStats);
        tempCache[bucketGh].aggregates[aggregateGh].value = tempCache[bucketGh].aggregates[aggregateGh].stats.mean;
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
