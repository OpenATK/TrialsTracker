let gh = require('ngeohash');
var harvest = require('./getHarvest').default;
var csvjson = require('csvjson');
var fs = require('fs');
var URL = require('url');
var {domain, token} = require('./config');
var oada = require('@oada/oada-cache').default;
const {expect} = require('chai');
var received = 0;

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
                      '_type': 'application/vnd.oada.tiled-maps.yield-moisture-dataset.1+json',
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

async function setupWatch(conn, tre, payload) {
	//watch the endpoint
	var getOne = await conn.get({
		path: '/bookmarks/test',
		tree: tre || tree,
		watch: {
      payload: payload || {someExtra: 'payload'},
      func: () => received++,
		}
	})
  expect(getOne.status).to.equal(200);
	return {getOne}
}



describe('How much data can we push through OADA before it backs up', async function() {
  var connOne;
  var connTwo;
  var offset = 0;
  before('Create the connections', async function() {
    connOne = await oada.connect({
      domain,
      token,
    })
    connTwo = await oada.connect({
      domain,
      token,
    })
    var options = { delimiter : ','};
    var data = fs.readFileSync('./public/home_back_lane44_2015_harvest.csv', { encoding : 'utf8'});
    var csvData = csvjson.toObject(data, {delimiter: ','})
    var asHarvested = await harvest.getAsHarvested(csvData, offset)
    Object.keys(asHarvested || {}).forEach((crop) => {
      Object.keys(asHarvested[crop] || {}).forEach((bucket) => {
        //        if (!available[crop]['geohash-'+bucket.length][bucket]) {
          delete asHarvested[crop][bucket]
        //}
      })
    })
    await harvest.deleteAsHarvested(asHarvested, oada, tree)
    //TODO: really need to delete aggregates from every level, but oh well....
    var tiledMaps = await harvest.getTiledMaps(asHarvested, [6,7])
    await harvest.deleteTiledMaps(tiledMaps, oada, tree)
  })
  
  it('Start by running 1X', async function() {
    this.timeout(40000);
    var result = await setupWatch(connOne);
    var speed = 4000;
    await harvest.getAsHarvestedAndPush(csvData, state, oada, tree, offset, speed)

    await Promise.delay(30000);
    expect(received).to.equal(30);
  })

    /*
  it('Ramp speed up to 2X', async function() {
    return harvest.getAsHarvestedAndPush(csvData, state, oada, tree, offset, speed).then(() => {
      return
    })
  })*/
})
