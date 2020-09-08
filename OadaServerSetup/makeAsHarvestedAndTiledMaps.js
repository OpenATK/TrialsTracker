let uuid = require('uuid').v4;
var harvest = require('./getHarvest.js');
var csvjson = require('csvjson');
var rr = require('recursive-readdir');
var fs = require('fs');
var oada = require('@oada/oada-cache');
var Promise = require('bluebird');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var CONNECTION;

var yield_data_directory = process.argv[2] || 'YieldData';
var domain = process.argv[3] || 'localhost';
var token = process.argv[4] || 'def';

var tree = {
	'bookmarks': {
		'_type': 'application/vnd.oada.bookmarks.1+json',
		'_rev': '0-0',
		'harvest': {
			'_type': 'application/vnd.oada.harvest.1+json',
			'_rev': '0-0',
			'as-harvested': {
				'_type': 'application/vnd.oada.as-harvested.1+json',
				'_rev': '0-0',
				'yield-moisture-dataset': {
					'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
					'_rev': '0-0',
					'crop-index': {
						'*': {
							'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
							'_rev': '0-0',
							'geohash-length-index': {
								'*': {
									'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
									'_rev': '0-0',
									'geohash-index': {
										'*': {
                      '_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
                      '_rev': '0-0',
										}
									}
								}
							}
						}
					}
				},
      },
			'tiled-maps': {
				'_type': 'application/vnd.oada.tiled-maps.1+json',
				'_rev': '0-0',
        'dry-yield-map': {
          '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
					'_rev': '0-0',
					'crop-index': {
						'*': {
            '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
							'_rev': '0-0',
							'geohash-length-index': {
								'*': {
                  '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
									'_rev': '0-0',
									'geohash-index': {
										'*': {
                      '_type': 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
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

function readData(directory) {
  return oada.connect({
    domain: 'https://'+domain,
    token: token,
  }).then((conn) => {
    CONNECTION = conn;
    return CONNECTION.resetCache().then(async () => {
      let files = await rr('./' + directory)
      files = files.filter(file => file.substr(-3) === 'csv');
      console.log('files', files);
      return Promise.map(files, (file) => {
        console.log('Processing ' + file);
        var options = { delimiter : ','};
        var data = fs.readFileSync(file, { encoding : 'utf8'});
        var jsonCsvData = csvjson.toObject(data, options);
        return harvest.getAsHarvested(jsonCsvData).then((asHarvested) => {
          return harvest.pushAsHarvested(asHarvested, CONNECTION, tree).then(() => {
            return harvest.getTiledMaps(asHarvested, [1,2,3,4,5,6,7]).then((tiledMaps) => {
              return harvest.pushTiledMaps(tiledMaps, CONNECTION, tree)
            }, {concurrency: 1})
          }, {concurrency: 1})
        }, {concurrency: 1})
      }, {concurrency: 1})
    }).then(() => {
     process.exit();
    })
  }).catch((err) => {
   console.log("errored", err)
   process.exit();
  })
}

readData(yield_data_directory)
