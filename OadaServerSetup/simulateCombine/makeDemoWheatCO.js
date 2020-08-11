var _ = require('lodash');
var md5 = require('md5');
var urlLib = require('url');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oada = require('@oada/oada-cache').default;
var Promise = require('bluebird');
var uuid = require('uuid');
var axios = require('axios');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var rawData = {};
var tiledMaps = {};
var tradeMoisture = {
  soybeans:  13,
  corn: 15,
  wheat: 13,
};
var TOKEN = 'def';
var DOMAIN = 'vip3.ecn.purdue.edu';
var CONNECTION;
var sampleRate = 1; // msg/s
var knownTree = {};

var tree = {
	bookmarks: {
		_type: 'application/vnd.oada.bookmarks.1+json',
		_rev: '0-0',
		harvest: {
			_type: 'application/vnd.oada.harvest.1+json',
			_rev: '0-0',
			'as-harvested': {
				_type: 'application/vnd.oada.as-harvested.1+json',
				_rev: '0-0',
				'yield-moisture-dataset': {
					_type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
					_rev: '0-0',
					'crop-index': {
						'*': {
							_type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
							_rev: '0-0',
							'geohash-length-index': {
								'*': {
									_type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
									_rev: '0-0',
									'geohash-index': {
										'*': {
                      _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
                      _rev: '0-0',
										}
									}
								}
							}
						}
					}
				},
      },
			'tiled-maps': {
				_type: 'application/vnd.oada.tiled-maps.1+json',
				_rev: '0-0',
        'dry-yield-map': {
          _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
					_rev: '0-0',
					'crop-index': {
						'*': {
            _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
							_rev: '0-0',
							'geohash-length-index': {
								'*': {
                  _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
									_rev: '0-0',
									'geohash-index': {
										'*': {
                      _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
										}
									}
								}
							}
						}
					}
				},
			}
		},
	}
};

async function asyncForEach(array, offset, callback) {
  for (let index = offset || 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

readData('./flow_rate3k-6k.csv')

function readData(file) {
  var options = { delimiter : ','};
	var data = fs.readFileSync(file, { encoding: 'utf8'});
  var csvData = csvjson.toObject(data, options);
  return oada.connect({
    domain: 'https://'+DOMAIN,
    token: TOKEN,
    cache: {name: 'importing'}
  }).then((conn) => {
    CONNECTION = conn;
    return CONNECTION.resetCache().then(() => {
      return getAsHarvested(csvData, 0).then((asHarvested) => {
        return getTiledMaps(asHarvested, [1,2,3,4,5,6,7]).then((tiledMaps) => {
          console.log('ready');
          return pushTiledMaps(tiledMaps)
        })
      })
    })
  })
}

async function getAsHarvested(data, offset) {
  var asHarvested = {};
	return Promise.mapSeries(data, (row, i) => {
  //	await asyncForEach(data, offset, async (row, i) => {
    geohash = gh.encode(row.lat, row.lon, 7);
    var crop = 'Wheat';
    crop = crop.replace(/\w\S*/g, txt => txt.toLowerCase());
    asHarvested[crop] = asHarvested[crop] || {};
    asHarvested[crop][geohash] = asHarvested[crop][geohash] || {
      'data': {},
      templates: {},
    };

		let template = {
			area: { units: 'acres' },
			weight: { units: 'bushels' },
			moisture: {
				units: '%H2O',
				value: tradeMoisture[crop]
			},
			location: { datum: 'WGS84' },
			crop,
		}
		let template_id = md5(JSON.stringify(template));
    asHarvested[crop][geohash].templates[template_id] = template;

    // Add the data point
    var id = uuid();
    var pt = {
      id,
      template: template_id,
			moisture: row['Moisture(%)'] || 10,
      location: {
        lat: row.lat,
        lon: row.lon,
      },
    };

		var val = +row.data; // bu/s
		//console.log(val)
		pt.speed = row.speed;
    pt.area = (row.speed*5280/3600)*(row['Swath Width(ft)'] || 30)/43560.0;
		//    pt.weight = val*pt.area;
		pt.weight = val * sampleRate;

    if (isNaN(pt.weight)) {
      console.log('````````````NEW ONE``````````');
      console.log(val);
      console.log(row['Speed(mph)']);
      console.log(row['Swath Width(ft)']);
      console.log(pt.area);
			console.log(pt.weight);
			return
		}
		var id = md5(JSON.stringify(pt));
		pt.id = id;

		let stuff = {
			data: {
				[id]: pt
      },
      _context: {
        'crop-index': crop,
        'geohash-length-index': 'geohash-7'
      }
    }

    asHarvested[crop][geohash].data[id] = pt;

		let path = '/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/'+crop+'/geohash-length-index/geohash-7/geohash-index/'+geohash;
    let dt = (i > 0) ? (row.ts - data[i-1].ts)*1000 : 1000;
    console.log('geohash', geohash, 'iteration', i, 'waiting',dt);
    //    await Promise.delay(dt/10)
    return /*CONNECTION.put({
			path,
			tree,
			data: stuff
    }).catch((err) => {
      console.log(err);
      return
    })*/
  }).then(() => {
    return asHarvested;
  })
}

function pushAsHarvested(asHarvested) {
  return Promise.map(Object.keys(asHarvested || {}), (crop) => {
      return Promise.map(Object.keys(asHarvested[crop] || {}), (bucket) => {
        return CONNECTION.put({
          path: `/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
          tree,
          data: asHarvested[crop][bucket]
        })
      })
    })
}

function getTiledMaps(asHarvested, levels) {
  var tiledMaps = {};
  var i = 1;
  return Promise.map(Object.keys(asHarvested || {}), (crop) => {
    return Promise.map(Object.keys(asHarvested[crop] || {}), (bucket) => {
      return Promise.mapSeries(Object.keys(asHarvested[crop][bucket].data || {}), (aggregate) => {
        var pt = asHarvested[crop][bucket].data[aggregate];
        return Promise.map(levels, (level) => {
          var weight = pt.weight;
          if (pt.moisture > tradeMoisture[crop]) {
            weight = weight*(100-pt.moisture)/(100-tradeMoisture[crop]);// Adjust weight for moisture content
          }
          var ghlen = 'geohash-'+(level);
          var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
          var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
          if (isNaN(pt.weight)) {
            console.log(pt);
          }
          var additionalStats = {
            count: 1,
            weight: {
              sum: weight,
              'sum-of-squares': Math.pow(weight, 2),
						},
						'yield-squared-area': Math.pow(weight/pt.area, 2)*pt.area,
            area: {
              sum: pt.area,
              'sum-of-squares': Math.pow(pt.area, 2)
						},
						'sum-yield-squared-area': Math.pow(weight/pt.area, 2)*pt.area,
					};
          //Handle new crop types
					tiledMaps[crop] = tiledMaps[crop] || {};
					tiledMaps[crop][bucketGh] = tiledMaps[crop][bucketGh] || {
            stats: {
              area: {
                sum: 0,
                'sum-of-squares': 0,
              },
              weight: {
                sum: 0,
                'sum-of-squares': 0,
              },
						  'sum-yield-squared-area': 0,
						  'yield-squared-area': 0,
              count: 0,
            },
            datum: 'WGS84',
            'geohash-data': {},
            _context: {
              'tiled-maps': 'dry-yield-map',
              'crop-index': crop,
              'geohash-length-index': 'geohash-'+bucketGh.length,
              'geohash-index': bucketGh,
            }
          };
 
          var template = {
            area: { units: 'acres' },
            weight: { units: 'bushels' },
            moisture: { 
              units: '%H2O',
              value: tradeMoisture[crop]
            },
            location: { datum: 'WGS84' },
          };
          var template_id = md5(JSON.stringify(template))
          tiledMaps[crop][bucketGh].templates = tiledMaps[crop][bucketGh].templates || {};
          tiledMaps[crop][bucketGh].templates[template_id] = template;

          tiledMaps[crop][bucketGh].stats = recomputeStats(tiledMaps[crop][bucketGh].stats, additionalStats);
          tiledMaps[crop][bucketGh]['geohash-data'][aggregateGh] = tiledMaps[crop][bucketGh]['geohash-data'][aggregateGh] || {
            template: template_id,
            area: {
              sum: 0,
              'sum-of-squares': 0,
            },
            weight: {
              sum: 0,
              'sum-of-squares': 0,
            },
            count: 0,
            'sum-yield-squared-area': 0,
            'yield-squared-area': 0,
          }
          tiledMaps[crop][bucketGh]['geohash-data'][aggregateGh] = recomputeStats(tiledMaps[crop][bucketGh]['geohash-data'][aggregateGh], additionalStats);
          return tree;
        });
      });
    });
  }).then(() => {
    return tiledMaps;
  }).catch((err) => {
    console.log(err)
  })
};

function recomputeStats(currentStats, additionalStats) {
  currentStats.count = currentStats.count + additionalStats.count;
  currentStats.area.sum = currentStats.area.sum + additionalStats.area.sum;
  currentStats.area['sum-of-squares'] = currentStats.area['sum-of-squares'] + additionalStats.area['sum-of-squares'];
  currentStats.weight.sum = currentStats.weight.sum + additionalStats.weight.sum;
	currentStats.weight['sum-of-squares'] = currentStats.weight['sum-of-squares'] + additionalStats.weight['sum-of-squares'];
	currentStats['sum-yield-squared-area'] = currentStats['sum-yield-squared-area'] + additionalStats['sum-yield-squared-area'];
  return currentStats;
};

function pushTiledMaps(tiledMaps) {
  return Promise.map(Object.keys(tiledMaps || {}), (crop) => {
    return Promise.mapSeries(Object.keys(tiledMaps[crop] || {}), (bucket) => {
      console.log('pushing tiled map', crop, bucket);
      return CONNECTION.put({
        path: `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
        tree,
        data: tiledMaps[crop][bucket]
      }).catch((err)=> {
        console.log(err)
        return
      })
    })
  }).then(() => {
    console.log('doneso')
    return CONNECTION.disconnect()
  })
}
