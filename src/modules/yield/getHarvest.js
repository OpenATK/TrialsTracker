var _ = require('lodash');
var md5 = require('md5');
var gh = require('ngeohash');
var Promise = require('bluebird');
var uuid = require('uuid');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var paused = true;
var speed;
var tradeMoisture = {
  soybeans:  13,
  corn: 15,
  wheat: 13,
};
var j = 0;

async function getAsHarvested(data, offset) {
  var asHarvested = {};
  return Promise.mapSeries(data, (row, i) => {
    if (i < offset) return;
    var geohash = gh.encode(row.Latitude, row.Longitude, 7);
    var crop = row['Product - Name'] || row['Product'];
    crop = crop.replace(/\w\S*/g, txt => txt.toLowerCase());
    asHarvested[crop] = asHarvested[crop] || {};
    asHarvested[crop][geohash] = asHarvested[crop][geohash] || {
      'data': {},
      templates: {},
      _context: {
        'crop-index': crop,
        'geohash-length-index': 'geohash-7',
        'geohash-index': geohash,
        'as-harvested': 'yield-moisture-dataset',
      }
    };

		let template = {
			area: { units: 'acres' },
			weight: { units: 'bushels' },
			moisture: {
				units: '%H2O',
				value: tradeMoisture[crop]
			},
      location: { datum: 'WGS84' },
      speed: {
        units: 'mph'
      },
			crop,
		}
		let template_id = md5(JSON.stringify(template));
    asHarvested[crop][geohash].templates[template_id] = template;

    // Add the data point
    var id = uuid();
    var pt = {
      template: template_id,
      moisture: row['Moisture(%)'],
      location: {
        lat: row.Latitude,
        lon: row.Longitude,
        alt: row['Elevation(ft)'],
      },
    };

    var val = +row['Estimated Volume (Wet)(bu/ac)'];
    pt.speed = row['Speed(mph)']
    if (!val) val = +row['Yld Vol(Wet)(bu/ac)'];
    if (row['Swath Width(ft)']) {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swath Width(ft)']/43560.0;
    } else {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swth Wdth(ft)']/43560.0;
    }
    pt.weight = val*pt.area;

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

    asHarvested[crop][geohash].data[id] = pt;
    return
  }).then(() => {
    return asHarvested;
  })
}

async function asyncForEach(array, offset, callback) {
  for (let index = offset || 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

async function getAsHarvestedAndPush(data, state, CONNECTION, connection_id, tree, offset, delay) {
  paused = false;
  var asHarvested = {};
  await asyncForEach(data, offset || 0, (row, i) => {
    if (paused) throw new Error('paused')
    if (i < offset) return
    var geohash = gh.encode(row.Latitude, row.Longitude, 7);
    var crop = row['Product - Name'] || row['Product'];
    crop = crop.replace(/\w\S*/g, txt => txt.toLowerCase());
    asHarvested[crop] = asHarvested[crop] || {};
    asHarvested[crop][geohash] = asHarvested[crop][geohash] || {
      'data': {},
      templates: {},
      _context: {
        'crop-index': crop,
        'geohash-length-index': 'geohash-7',
        'geohash-index': geohash,
        'as-harvested': 'yield-moisture-dataset',
      }
    };

		let template = {
			area: { units: 'acres' },
			weight: { units: 'bushels' },
			moisture: {
				units: '%H2O',
				value: tradeMoisture[crop]
			},
      location: { datum: 'WGS84' },
      speed: {
        units: 'mph'
      },
			crop,
		}
		let template_id = md5(JSON.stringify(template));
    asHarvested[crop][geohash].templates[template_id] = template;

    // Add the data point
    var id = uuid();
    var pt = {
      template: template_id,
      moisture: row['Moisture(%)'],
      location: {
        lat: row.Latitude,
        lon: row.Longitude,
        alt: row['Elevation(ft)'],
      },
    };

    var val = +row['Estimated Volume (Wet)(bu/ac)'];
    pt.speed = row['Speed(mph)']
    if (!val) val = +row['Yld Vol(Wet)(bu/ac)'];
    if (row['Swath Width(ft)']) {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swath Width(ft)']/43560.0;
    } else {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swth Wdth(ft)']/43560.0;
    }
    pt.weight = val*pt.area;

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

    var data = {
      data: {
        [id]: pt,
      },
      _context: {
        'crop-index': crop,
        'geohash-length-index': 'geohash-7',
        'geohash-index': geohash,
        'as-harvested': 'yield-moisture-dataset',
      }
    }

    asHarvested[crop][geohash].data[id] = pt;
    return Promise.delay(speed || delay).then(() => {
      return CONNECTION.put({
        connection_id,
        path: `/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/${crop}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`,
        tree,
        data,
      }).then(() => {
        state.set('livedemo.text', 'Pushing harvest data...'+i.toString());
        state.set('livedemo.index', i)
        return
      })
    })
  }).then(() => {
    return asHarvested;
  }).catch((err) => {
    if (/^paused/.test(err.message)) return;
  })
}

async function getAsHarvestedAndDelete(data, CONNECTION, connection_id, tree, offset, delay) {
  var asHarvested = {};
  console.log('DATA LENGTH', data.length)
  return Promise.map(data || [], (row, i) => {
    var geohash = gh.encode(row.Latitude, row.Longitude, 7);
    var crop = row['Product - Name'] || row['Product'];
    crop = crop.replace(/\w\S*/g, txt => txt.toLowerCase());
    asHarvested[crop] = asHarvested[crop] || {};
    asHarvested[crop][geohash] = asHarvested[crop][geohash] || {
      'data': {},
      templates: {},
      _context: {
        'crop-index': crop,
        'geohash-length-index': 'geohash-7',
        'geohash-index': geohash,
        'as-harvested': 'yield-moisture-dataset',
      }
    };

		let template = {
			area: { units: 'acres' },
			weight: { units: 'bushels' },
			moisture: {
				units: '%H2O',
				value: tradeMoisture[crop]
			},
      location: { datum: 'WGS84' },
      speed: {
        units: 'mph'
      },
			crop,
		}
		let template_id = md5(JSON.stringify(template));
    asHarvested[crop][geohash].templates[template_id] = template;

    // Add the data point
    var id = uuid();
    var pt = {
      template: template_id,
      moisture: row['Moisture(%)'],
      location: {
        lat: row.Latitude,
        lon: row.Longitude,
        alt: row['Elevation(ft)'],
      },
    };

    var val = +row['Estimated Volume (Wet)(bu/ac)'];
    pt.speed = row['Speed(mph)']
    if (!val) val = +row['Yld Vol(Wet)(bu/ac)'];
    if (row['Swath Width(ft)']) {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swath Width(ft)']/43560.0;
    } else {
      pt.area = (row['Speed(mph)']*5280/3600)*row['Swth Wdth(ft)']/43560.0;
    }
    pt.weight = val*pt.area;

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
    asHarvested[crop][geohash].data[id] = pt;
    console.log('deleting geohash/data/'+id, i)
    return Promise.delay(delay*1000).then(() => {
      return CONNECTION.delete({
        connection_id,
        path: `/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/${crop}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}/data/${id}`,
        tree,
      })
    })
  }, {concurrency: 500}).then(() => {
    return asHarvested;
  })
}

function pushAsHarvested(asHarvested, CONNECTION, tree) {
  return Promise.mapSeries(Object.keys(asHarvested || {}), (crop) => {
    return Promise.mapSeries(Object.keys(asHarvested[crop] || {}), (bucket) => {
      return CONNECTION.put({
        path: `/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
        tree,
        data: asHarvested[crop][bucket]
      })
    })
  })
}

function deleteAsHarvested(asHarvested, CONNECTION, connection_id, tree) {
  return Promise.mapSeries(Object.keys(asHarvested || {}), (crop) => {
    return Promise.mapSeries(Object.keys(asHarvested[crop] || {}), (bucket) => {
      return CONNECTION.delete({
        connection_id,
        path: `/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
        tree,
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
          return
        });
      });
    });
  }).then(() => {
    return tiledMaps;
  }).catch((err) => {
    console.log(err)
  })
};

function recomputeStats(currentStats, additionalStats, factor) {
  factor = factor || 1;
  // Handle when whole thing is undefined
  currentStats = currentStats || {
    count: 0,
    weight: {
      sum: 0, 
      'sum-of-squares': 0,
    },
    area: {
      sum: 0,
      'sum-of-squares': 0,
    },
    'sum-yield-squared-area': 0,
  }
  // Handle sub-pieces that are undefined
  currentStats.count = currentStats.count || 0;
  currentStats.area = currentStats.area || {};
  currentStats.area.sum = currentStats.area.sum || 0;
  currentStats.area['sum-of-squares'] = currentStats.area['sum-of-squares'] || 0;
  currentStats.weight = currentStats.weight || {};
  currentStats.weight.sum = currentStats.weight.sum || 0;
	currentStats.weight['sum-of-squares'] = currentStats.weight['sum-of-squares'] || 0;
  currentStats['sum-yield-squared-area'] = currentStats['sum-yield-squared-area'] || 0;

  //handle when additionalStats is undefined
  if (!additionalStats) {
    currentStats.yield = {
      mean: currentStats.weight.sum/currentStats.area.sum,
      variance: currentStats['sum-yield-squared-area']/currentStats.area.sum,
    }
    currentStats.yield.standardDeviation = Math.pow(currentStats.yield.variance, 0.5);
    return currentStats
  }

  // Sum the two
  currentStats.count += additionalStats.count*factor;
  currentStats.area.sum += additionalStats.area.sum*factor;
  currentStats.area['sum-of-squares'] += additionalStats.area['sum-of-squares']*factor;
  currentStats.weight.sum += additionalStats.weight.sum*factor;
	currentStats.weight['sum-of-squares'] += additionalStats.weight['sum-of-squares']*factor;
  currentStats['sum-yield-squared-area'] += additionalStats['sum-yield-squared-area']*factor;

  //Handle negative values
  if (currentStats.count < 0) currentStats.count = 0;
  if (currentStats.area.sum < 0) currentStats.area.sum = 0;
  if (currentStats.area['sum-of-squares'] < 0) currentStats.area['sum-of-squares'] = 0;
  if (currentStats.weight.sum < 0) currentStats.weight.sum = 0;
  if (currentStats.weight['sum-of-squares'] < 0) currentStats.weight['sum-of-squares'] = 0;
  if (currentStats['sum-yield-squared-area'] < 0) currentStats['sum-yield-squared-area'] = 0;

  // Compute Yield
  currentStats.yield = {
    mean: currentStats.weight.sum/currentStats.area.sum,
    variance: currentStats['sum-yield-squared-area']/currentStats.area.sum,
  }
  currentStats.yield.standardDeviation = Math.pow(currentStats.yield.variance, 0.5);
  return currentStats;
}

function pushTiledMaps(tiledMaps, CONNECTION, tree) {
  return Promise.mapSeries(Object.keys(tiledMaps || {}), (crop) => {
    return Promise.mapSeries(Object.keys(tiledMaps[crop] || {}), (bucket) => {
      return CONNECTION.put({
        path: `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
        tree,
        data: tiledMaps[crop][bucket]
      }).catch((err)=> {
        console.log(err)
        return
      })
    })
  })
}

function deleteTiledMaps(tiledMaps, CONNECTION, connection_id,  tree) {
  var i = 0;
  return Promise.mapSeries(Object.keys(tiledMaps || {}), (crop) => {
    return Promise.mapSeries(Object.keys(tiledMaps[crop] || {}), (bucket) => {
      console.log('deleteTiledMaps', i++, crop, bucket)
      return CONNECTION.delete({
        path: `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${crop}/geohash-length-index/geohash-${bucket.length}/geohash-index/${bucket}`,
        tree,
        connection_id,
      }).catch((err)=> {
        console.log(err)
        return
      })
    }, {concurrency: 500})
  })
}

export default {
  getAsHarvested,
  getAsHarvestedAndPush,
  getAsHarvestedAndDelete,
  pushAsHarvested,
  deleteAsHarvested,
  getTiledMaps,
  pushTiledMaps,
  deleteTiledMaps,
  recomputeStats,
  setPause: (val) => paused = val,
  setSpeed: (val) => speed = val,
}
