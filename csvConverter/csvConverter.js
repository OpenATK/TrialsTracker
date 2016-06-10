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
var token = 'TjBuEIdmKeeSAd_iVbnM4rgjufeh_IMXRAEqhVy8';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);


exports.csvToOadaYield = function() {
  rr('.', function(err,files) {
//    for (var i = 0; i < files.length; i++) {
    for (var i = 0; i < 1; i++) {
     // if ((files[i]).substr(-3) == 'csv') {
      console.log('Processing ' + files[i]);
//        var dataArray = csvjson.toObject(files[i]).output;
        var dataArray = csvjson.toObject('2015/Calloway/Church17/calloway_church17_2015_harvest.csv').output;
        this.processData(dataArray);
    //  }
    }
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

processData = function(csvJson) {
  tempCache = {};

  // Loop through each row, create a geohash if necessary
  var geohash;
  for (var i = 0; i < csvJson.length; i++) {
    // Find the geohash its in, open it up (create if necessary) and append to data
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    //If the geohash exists, append to it and recompute stats, else create it.
    if (tempCache[geohash]) {

      var val = +csvJson[i]['Estimated Volume (Wet)(bu/ac)'];
      if (!val) val = +csvJson[i]['Yld Vol(Wet)(bu/ac)'];
      additionalStats = {
        n: 1,
        sum: val,
        mean: val,
        min: val,
        max: val,
//        std: 0,
      };
      console.log(additionalStats);
      tempCache[geohash].stats = recomputeStats(tempCache[geohash].stats, additionalStats);

      // add a data point
      tempCache[geohash].data[uuid.v4()] = {
        location: {
          lat: csvJson[i].Latitude,
          lon: csvJson[i].Longitude,
          alt: csvJson[i]['Elevation(ft)'],
        },
        value: csvJson[i]['Estimated Volume (Wet)(bu/ac)'], 
        time: csvJson[i]['Date / Time'],
      };

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
          sum: +csvJson[i]['Estimated Volume (Wet)(bu/ac)'],
          mean: +csvJson[i]['Estimated Volume (Wet)(bu/ac)'],
          min: +csvJson[i]['Estimated Volume (Wet)(bu/ac)'],
          max: +csvJson[i]['Estimated Volume (Wet)(bu/ac)'],
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
      tempCache[geohash].data[uuid.v4()] = {
        location: {
          lat: csvJson[i].Latitude,
          lon: csvJson[i].Longitude,
          alt: csvJson[i]['Elevation(ft)'],
        },
        value: +csvJson[i]['Estimated Volume (Wet)(bu/ac)'],
        time: csvJson[i]['Date / Time'],
      };
    }

  }
  var self = this;

  Promise.each(Object.keys(tempCache), function(key) {
   var geohash = tempCache[key];
    //If the geohash is on the server, append and update; else create  
    return agent('GET', url+key)
     .set('Authorization', 'Bearer '+ token)
     .end()
     .then(function onResult(response) {
       console.log(response.text);
       var newStats = self.recomputeStats(response.stats, geohash.stats);
       // Put the updated stats and the additional data points
       return agent('PUT', url+key+'/stats/')
         .set('Authorization', 'Bearer '+ token)
         .send(newStats)
         .end();
     })
    .catch((e) => e.response && e.response.res.statusCode === 404, function() {
      var tmp = _.omit(geohash, 'data');
console.log(tmp);
      return agent('POST', 'https://localhost:3000/resources/')
        .set('Authorization', 'Bearer '+ token)
        .send(tmp)
        .end()
        .then(function(response) {
          var resId = response.headers.location.replace(/^\/resources\//, '');

          return agent('PUT', url + key)
            .set('Authorization', 'Bearer ' + token)
            .send({_id: resId, _rev: '0-0'})
            .end();
        });
     })
    .then(function() {
      return agent('PUT', url+key+'/data/')
        .set('Authorization', 'Bearer '+ token)
        .send(geohash.data)
        .end();     
    });
  })
  .catch(function (e) {
    console.log('Bad error');
    console.log(e);
throw e;
  });
}
