import { sequence } from 'cerebral'
import csvjson from 'csvjson'
import uuid from 'uuid'
import { CRS } from 'leaflet'
import L from 'leaflet'
import { wait, equals, when, debounce, set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import gh from 'ngeohash';
import _ from 'lodash';
import {longestCommonPrefix, recursiveGeohashSearch } from './utils/recursiveGeohashSearch'
import Promise from 'bluebird'
import * as fields from '@oada/fields-module/sequences'
import oadaMod from '@oada/cerebral-module/sequences'
import { geohashesFromTile, filterGeoahshes, drawTile } from './draw';
import { getGeohashes, simulateCombine } from './simulateCombine'
import { makeDemoWheatCO } from './makeDemoWheatCO'
import harvest from './getHarvest'
var createTileZ;
var speeds = [4000, 1000, 500, 250, 125, 62.5];

let t;
let A;
let C;

var tree = {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': '0-0',
    'harvest': {
      '_type': 'application/vnd.oada.harvest.1+json',
      '_rev': '0-0',
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
                }
              }
            }
          }
        }
      }
    }
  }
}

var fullTree = {
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

// Yield index updated. New crops or geohash tiles are now vailable.
export const handleYieldIndexWatch = sequence('yield.handleYieldWatch', [
  equals(props`response.change.type`), {
  'delete': [
    //Delete case: clear data from tiles
      ({state, props, oada}) => {
        var geohashes = {};
        var connection_id = state.get('yield.connection_id');
        var body = props.response.change.body;
        var path = `/bookmarks/harvest/tiled-maps/dry-yield-map${props.nullPath}`
        var geohash = props.nullPath.split('/geohash-index/')[1].split('/')[0];
        var crop = props.nullPath.split('/crop-index/')[1].split('/')[0];
        var index = state.get(`yield.index.${crop}`);
        if (index['geohash-'+geohash.length][geohash]) {
          state.unset(`oada.${connection_id}.watches.${path}`)
          return oada.delete({
            path,
            unwatch: true,
            connection_id,
          }).catch((err) => {
            if (err.status === 404) return
          }).then(() => {
            return {
              geohashes: {[crop]: [geohash]},
            }
          })
        } else return {geohashes: {[crop]: [geohash]}}
      },
    ],
    'merge': [
    //Merge case: determine whether these new geohashes should be watched. 
      ({state, props, oada}) => {
        var connection_id = state.get('yield.connection_id');
        var geohashes = {};
        var body = props.response.change.body;
        return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
          return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
            return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
              state.set(`yield.index.${crop}.geohash-${geohash.length}.${geohash}`, true)
              geohashes[crop] = geohashes[crop] || [];
              return geohashes[crop].push(geohash);
            })
          })
        }).then(() => {
          return {geohashes}
        })
      },
    ]
  },
  mapOadaToYieldIndex,
  drawTile
])

export const fetch = sequence('yield.fetch', [
  ({props, state}) => {
    var signals = props.signals ? props.signals : [];
    return {signals: [...signals, 'yield.handleYieldIndexWatch']}
  },
  ({props, state}) => ({
    requests: [{
      path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
      connection_id: state.get('yield.connection_id'),
      tree,
      watch: {signals: props.signals},
    }],
	}),
  oadaMod.get,
  when(state`oada.${props`connection_id`}.bookmarks.harvest.tiled-maps.dry-yield-map`), {
    true: [],
    false: [
      ({props, state}) => ({
        requests: [{
          path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
          tree,
          connection_id: props.connection_id,
          data: {},
        }]
      }),
      oadaMod.put,

      ({props, state}) => ({
        requests: [{
          path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
          tree,
          connection_id: props.connection_id,
          watch: {signals: props.signals},
        }]
      }),
      oadaMod.get,
    ]
  },
  mapOadaToYieldIndex,
])

export const init = sequence('yield.init', [
  oadaMod.connect,
  //  ({props}) => console.log(props),
  set(state`yield.connection_id`, props`connection_id`),
 	fetch,
])

export const getPolygonStats = [
	({props}) => {t = Date.now();},
	polygonToGeohashes,
	//	geohashesToGeojson,
	getStatsForGeohashes,
	() => {
		console.log((Date.now() - t)/1000)
	},
]

export const handleGeohashesOnScreen = sequence('yield.handleGeohashesOnScreen', [
  drawTile,
]);

export const tileUnloaded = sequence('yield.tileUnloaded', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
    var geohashes = state.get(`yield.tilesOnScreen.${coordsIndex}`);
    var index = state.get(`yield.index.${props.layer}`);
    var watches = state.get(`oada.${connection_id}.watches`);
    return Promise.map(Object.keys(geohashes || {}), (geohash) => {
      if (geohash === 'coords') return
      let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${props.layer}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
      if (!index['geohash-'+geohash.length][geohash]) return
      if (!watches[path]) return 
      state.unset(`oada.${connection_id}.watches.${path}`)
      return oada.delete({
        path,
        unwatch: true,
        connection_id,
      }).catch((err) => {
        if (err.status === 404) return
      })
    }).then(()=> {
      return state.unset(`yield.tilesOnScreen.${coordsIndex}`);
    })
  },
]);

export const createTile = sequence('yield.createTile', [
  ({props}) => {createTileZ = props.coords.z},
  wait(500),
  when(props`coords.z`,(z) => z === createTileZ), {
    true: [
      geohashesFromTile,
      addGeohashesOnScreen,
      drawTile,
    ],
    false: [],
  }
])

export function mapOadaToYieldIndex({state}) {
	let id = state.get('yield.connection_id')
	let harvest = state.get(`oada.${id}.bookmarks.harvest`)
  if (harvest && harvest['tiled-maps'] && harvest['tiled-maps']['dry-yield-map']) {
		return Promise.map(Object.keys(harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
      state.set(`map.layers.${crop.charAt(0).toUpperCase() + crop.slice(1)}`, {visible: true});
      state.set(`yield.index.${crop}`, {});
			return Promise.map(Object.keys(harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
				if (harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength])
				state.set(`yield.index.${crop}.${ghLength}`, harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {});
				return
      })
		}).then(() => {
			return
		})
	}
	return
}

export const stopLiveData = sequence('yield.stopLiveData', [
  set(state`livedemo.index`, 0),
  set(state`livedemo.paused`, true),
  // TODO: delete data
])

export const pauseLiveData = sequence('yield.pauseLiveData', [
  set(state`livedemo.paused`, true),
  ({}) => {
    harvest.setPause(true);
  }
])

export const fastForwardLiveData = sequence('yield.fastForwardLiveData', [
  ({state}) => {
    var speed = state.get('livedemo.speed');
    speed = (speed+1 > 3) ? 0 : speed+1;
    state.set('livedemo.speed', speed);
    harvest.setSpeed(speeds[speed]);
  },
])

export const rewindLiveData = sequence('yield.rewindLiveData', [

])

export const runLiveDataClicked = sequence('yield.runLiveDataClicked', [
  // First, delete some data
  ({state, props, oada}) => {
    var speed = speeds[state.get('livedemo.speed')];
    state.set('livedemo.running', true);
    var offset = state.get('livedemo.index');
    var connection_id = state.get('yield.connection_id')
    var req = new XMLHttpRequest()
    req.open("GET", "/home_back_lane44_2015_harvest.csv", true);
    req.responseType = "text"
    var available = state.get(`yield.index`)
    console.log(available);
    req.onload = function(evt) {
      var csvData = csvjson.toObject(evt.target.response, {delimiter: ','})
      if (offset === 0) {
        state.set('livedemo.text', 'Removing harvest data to rerun it...')
        return harvest.getAsHarvested(csvData, offset).then((asHarvested) => {
          console.log('~~~~~~~~~~~~~~~~~~~~~~~')
          console.log('DONE GET AS HARVEST')
          console.log('~~~~~~~~~~~~~~~~~~~~~~~')
          console.log(asHarvested);
          Object.keys(asHarvested || {}).forEach((crop) => {
            Object.keys(asHarvested[crop] || {}).forEach((bucket) => {
              if (!available[crop]['geohash-'+bucket.length][bucket]) {
                delete asHarvested[crop][bucket]
              }
            })
          })
          return harvest.deleteAsHarvested(asHarvested, oada, connection_id, fullTree).then(() => {
            console.log('~~~~~~~~~~~~~~~~~~~~~~~')
            console.log('DONE DELETE AS HARVEST')
            console.log('~~~~~~~~~~~~~~~~~~~~~~~')
            //TODO: really need to delete aggregates from every level, but oh well....
            return harvest.getTiledMaps(asHarvested, [6,7]).then((tiledMaps) => {
              console.log('~~~~~~~~~~~~~~~~~~~~~~~')
              console.log('DONE GET TILED MAPS')
              console.log('~~~~~~~~~~~~~~~~~~~~~~~')
              return harvest.deleteTiledMaps(tiledMaps, oada, connection_id, fullTree).then(() => {
                console.log('~~~~~~~~~~~~~~~~~~~~~~~')
                console.log('DONE DELETE TILED MAPS')
                console.log('~~~~~~~~~~~~~~~~~~~~~~~')
                return
              })
            }, {concurrency: 1})
          }, {concurrency: 1})
        }).then(() => {
          return Promise.delay(5000).then(() => {
          state.set('livedemo.text', 'Running...')
          return harvest.getAsHarvestedAndPush(csvData, state, oada, connection_id, fullTree, offset, speed).then(() => {
            console.log('~~~~~~~~~~~~~~~~~~~~~~~')
            console.log('DONE PUSHING AS HARVESTED')
            console.log('~~~~~~~~~~~~~~~~~~~~~~~')
            return
          })
          })
        })
      } else {
        return harvest.getAsHarvestedAndPush(csvData, state, oada, connection_id, fullTree, offset, speed).then(() => {
          console.log('~~~~~~~~~~~~~~~~~~~~~~~')
          console.log('DONE PUSHING AS HARVESTED')
          console.log('~~~~~~~~~~~~~~~~~~~~~~~')
          return
        })
      }
    }
    req.send(null);
  },
]);

export const playLiveData = sequence('yield.playLiveData', [
  set(state`livedemo.paused`, false),
  runLiveDataClicked,
])



function addGeohashesOnScreen({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
	var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	state.set(`yield.tilesOnScreen.${coordsIndex}.coords`, props.coords);
  return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
	  return Promise.map(props.geohashes[crop] || [], (geohash) => {
		  return state.set(`yield.tilesOnScreen.${coordsIndex}.${geohash}`, true);
    })
	}).then(() => {
		return
	})
}

//Takes an array of polygons and returns the minimal set of geohashes to represent
//that polygon geometry. 
export function polygonToGeohashes({props}) {
	A = Date.now();
	return Promise.map((props.polygons || []), (obj) => {
    if (_.isEmpty(obj.polygon)) {
      var newObj = obj;
      newObj.geohashes = {};
      return Promise.resolve(newObj)
		};
    let newPoly = _.clone(obj.polygon);
		newPoly.push(obj.polygon[0])
		//Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
		let strings = [gh.encode(obj.bbox.north, obj.bbox.west, 9),
			gh.encode(obj.bbox.north, obj.bbox.east, 9),
			gh.encode(obj.bbox.south, obj.bbox.east, 9),
			gh.encode(obj.bbox.south, obj.bbox.west, 9)];
		let commonString = longestCommonPrefix(strings);
    return recursiveGeohashSearch(newPoly, commonString, []).then((geohashes) => {
      var newObj = obj;
      newObj.geohashes = geohashes;
      return newObj;
		})
  }).then((polygons) => {
		console.log('A', (Date.now() - A)/1000)
		return {polygons}
	})
}

export function geohashesToGeojson({state, props}) {
	let a = Date.now()
	let geohashPolygons = [];
	return Promise.map(props.polygons || [], (obj) => {
		geohashPolygons = [];
		return Promise.map(Object.keys(obj.geohashes || {}), (geohash) => {
      let ghBox = gh.decode_bbox(geohash);
      //create an array of vertices in the order [nw, ne, se, sw]
      let geohashPolygon = [
        [ghBox[1], ghBox[2]],
        [ghBox[3], ghBox[2]],
        [ghBox[3], ghBox[0]],
        [ghBox[1], ghBox[0]],
        [ghBox[1], ghBox[2]],
      ];
      geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
		}, {concurrency: 10}).then((result) => {
			state.set(`map.geohashPolygons`, geohashPolygons)
			return obj
		})
	}).then((polygons) => {
		state.set(`map.geohashPolygons`, geohashPolygons)
		return {polygons}
	})
}

// Takes the array of geohashes associated with each polygon and returns the
// combined stats using those geohashes; returns the polygon object which
// includes the following keys: id, type, polygon, geohashes, stats
function getStatsForGeohashes({props, state, oada}) {
  C = Date.now()
  let availableGeohashes = state.get('yield.index');
	return Promise.map(props.polygons || [], (obj, i) => {
		var stats = {};
    var geohashes = {};
    return Promise.map(Object.keys(availableGeohashes || {}), (crop) => {
      return Promise.map(Object.keys(obj.geohashes || {}), async (bucket) => {
				let ghLength = 'geohash-'+bucket.length;
        if (bucket.length < 3) {
					//TODO: handle this.  You' can't get aggregates of geohash-1 and 2
        }
        // Setup the geohashes part of a note's yield-stats
        geohashes[bucket] = geohashes[bucket] || {
          'crop-index': {}
        };
        // Skip geohashes that aren't available
        if (!availableGeohashes[crop][ghLength] || !availableGeohashes[crop][ghLength][bucket]){
          if (typeof obj.geohashes[bucket] === 'object') geohashes[bucket].aggregates = obj.geohashes[bucket];
          return geohashes[bucket]['crop-index'][crop] = {bucket: {}};
        }
        let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+bucket.length+'/geohash-index/'+bucket;
        return oada.get({
          connection_id: state.get('yield.connection_id'),
          path,
        }).then((response) => {
          let data = response.data;
          geohashes[bucket]['crop-index'][crop] = {
            bucket: {
              _id: response.headers['content-location'].replace(/^\//,''),
              _rev: response.headers['x-oada-rev']
            }
          }
          // Handle buckets that have aggregates
          if (typeof obj.geohashes[bucket] === 'object') {
            geohashes[bucket].aggregates = obj.geohashes[bucket];
            var ghData = data['geohash-data'] || {};
            return Promise.map(Object.keys(obj.geohashes[bucket] || {}), (geohash) => {
              stats[crop] = harvest.recomputeStats(stats[crop], ghData[geohash])
              return
            })
          }
          // Handle other buckets (no aggregates)
          stats[crop] = harvest.recomputeStats(stats[crop], data.stats)
          return
        }).catch((err) => {
          if (typeof obj.geohashes[bucket] === 'object') geohashes[bucket].aggregates = obj.geohashes[bucket];
          return geohashes[bucket]['crop-index'][crop] = {bucket: {}};
        })
			}, {concurrency: 10}).then(() => {
        stats[crop] = stats[crop] || {};
        stats[crop] = harvest.recomputeStats(stats[crop])
				if (stats[crop].count === 0) delete stats[crop]
				return
			})
    }, {concurrency: 10}).then(() => {
      var newObj = obj;
      newObj.geohashes = geohashes;
      newObj.stats = stats;
      return newObj
		})
  }, {concurrency: 10}).then((polygons) => {
    console.log('getStatsForGeohashes', (Date.now() - C)/1000);
		return {polygons}
	})
}



function getGeohashLevel(zoom, sw, ne) {                                         
  if (zoom >= 15) return 7;                                                      
  if (zoom >= 12) return 6;                                                      
  if (zoom >= 8) return 5;                                                       
  if (zoom >= 6) return 4;                                                       
  if (zoom <= 5) return 3;                                                       
}     
