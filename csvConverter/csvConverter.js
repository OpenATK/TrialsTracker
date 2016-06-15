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
var token = 'OTzuoYRU64_9QzfE-h2_FkKkkx8DTFHHhOWCBCYE';
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
    this.pushData();
  });
};

recomputeStats = function(curStats, additionalStats) {
  //http://math.stackexchange.com/questions/102978/incremental-computation-of-standard-deviation
  //stats.std = (((stats.n - 2)/(stats.n - 1))*stats.std) + Math.pow(((stats.sum+newValue)/(stats.n+1))-(stats.mean), 2)*(1/stats.n);
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
//        std: 0,
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
//          std: 0,
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

pushData = function() {
  var self = this;
  var cacheKeys = Object.keys(tempCache);
  var k = 1;
  console.log(cacheKeys.length);
  console.log(cacheKeys.length*5.55 + ' acres in geohashes @ 5.5 acres per');
  Promise.each(cacheKeys, function(key) {
    var geohash = tempCache[key];
    console.log(key, k++);
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
//        console.log('POSTING new geohash:');
//        console.log(tmp);
//        console.log(geohash);
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
//      console.log('PUTTING the data');
//      console.log(geohash);
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
