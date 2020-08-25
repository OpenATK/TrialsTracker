const md5 = require('md5');
const uuid = require('uuid');
const gh = require('ngeohash');
const Promise = require('bluebird');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var tradeMoisture = {
  soybeans:  13,
  corn: 15,
  wheat: 13,
};
var sampleRate = 1; // msg/s

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
                      _context: {}
										}
									}
								}
							}
						}
					}
				},
			},
		},
	}
};

async function asyncForEach(array, offset, callback) {
  for (let index = offset || 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export async function simulateCombine(data, offset, connection, connection_id) {
	//	return Promise.mapSeries(data, (row, i) => {
	await asyncForEach(data, offset, async (row, i) => {
    var geohash = gh.encode(row.lat, row.lon, 7);
    var cropType = 'Wheat';
		cropType = cropType.replace(/\w\S*/g, txt => txt.toLowerCase());

		let template = {
			area: { units: 'acres' },
			weight: { units: 'bushels' },
			moisture: {
				units: '%H2O',
				value: tradeMoisture[cropType]
			},
			location: { datum: 'WGS84' },
			cropType,
		}
		let template_id = md5(JSON.stringify(template));

    // Add the data point
    var pt = {
      id: uuid(),
      template: template_id,
			moisture: row['Moisture(%)'] || 13,
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
        'crop-index': cropType,
        'geohash-length-index': 'geohash-7'
      }
		}

		let path = '/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/'+cropType+'/geohash-length-index/geohash-7/geohash-index/'+geohash;
    //    let dt = (i > 0) ? (row.ts - data[i-1].ts)*1000 : 1000;
    //    await Promise.delay(dt/10)
		return connection.put({
			path,
			tree,
      data: stuff,
      connection_id
    }).catch((err) => {
      console.log(err);
      return
    })
	})
}

export async function getGeohashes(data, offset) {
  var geohashes = {}
	return Promise.mapSeries(data, (row, i) => {
	  return Promise.map([7], (level) => {
      var geohash = gh.encode(row.lat, row.lon, level);
      geohashes[geohash] = true;
      return 
    })
  }).then(() => {
    return geohashes
  })
}
