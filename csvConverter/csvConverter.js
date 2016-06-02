var csvjson = require('csvjson');
var fs = require('fs');
var _ = require('lodash');
var uuid = require('uuid');
var gh = require('ngeohash');

exports.csvToOadaYield = function() {
  var dataArray = csvjson.toObject('./2015/Bair/BAIR100_2015_harvest.csv').output;
  this.processData(dataArray);
};

computeStats = function(stats, newValue) {

  if (stats.count >= 1) {
    //http://math.stackexchange.com/questions/102978/incremental-computation-of-standard-deviation
    stats.std = (((stats.n - 2)/(stats.n - 1))*stats.std) + Math.pow(((stats.sum+newValue)/(stats.n+1))-(stats.mean), 2)*(1/stats.n);
    stats.n++;
    stats.sum = stats.sum + newValue;
    stats.mean = stats.sum/stats.count;
    if (stats.min > newValue) { stats.min = newValue;}
    if (stats.max < newValue) { stats.max = newValue;}

  // this shouldn't ever run
  } else if (!stats) {

    console.log('stats else ran');
    stats.n = 1;
    stats.sum = newValue;
    stats.mean = newValue;
    stats.min = newValue;
    stats.max = newValue;
    stats.std = 0;
   
  }
  
  return stats;
}

processData = function(csvJson) {
  dataOut = {};

  // Loop through each row, create a geohash if necessary
  var geohash;
  for (var i = 0; i < csvJson.length; i++) {

    // Find the geohash its in, open it up (create if necessary) and append to data
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    if (dataOut[geohash]) {
      console.log(geohash + ' exists. Updating...');

      //compute/recompute stats 
      dataOut[geohash].stats = computeStats(dataOut[geohash].stats, csvJson[i]['Yield Mass (Wet)(lb/ac)']);

      // add a data point
      dataOut[geohash].data[uuid.v4()] = {
        location: {
          lat: csvJson[i].Latitude,
          lon: csvJson[i].Longitude,
          alt: csvJson[i]['Elevation(ft)'],
        },
        value: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
        time: csvJson[i]['Date / Time'],
      };

    } else {
      console.log(geohash + ' doesnt exist. Creating...');

      dataOut[geohash] = {

        _id: uuid.v4(),
        _rev: '1-'+uuid.v4(),
        _type: 'yield data. not sure what belongs here',
        _meta: {},

        dataType: {
          definition: 'https://github.com/oada-formats',
          name: 'wet-yield',
        },

        context: {
          'geohash-7': geohash,
        },

        stats: {

          n: 1,
          sum: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
          mean: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
          min: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
          max: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
          std: 0,
   
        },
   
        template: {
          '1': {
            sensor: { id: 'Tractor or sensor reference here?'},
            units: 'bu/ac',
          },
        },    
  
        data: {},

      };
      dataOut[geohash].data[uuid.v4()] = {
        location: {
          lat: csvJson[i].Latitude,
          lon: csvJson[i].Longitude,
          alt: csvJson[i]['Elevation(ft)'],
        },
        value: csvJson[i]['Yield Mass (Wet)(lb/ac)'],
        time: csvJson[i]['Date / Time'],
      };
    }

  }

  var outFileName = '../app/modules/Home/Bair100.js';
  fs.writeFile(outFileName, 'export default ' + JSON.stringify(dataOut), (err) => {
    if (err) throw err;
    console.log('Generated file ' + outFileName);
  });

}
