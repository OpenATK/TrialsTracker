import { sequence } from 'cerebral'
import csvjson from 'csvjson'
import uuid from 'uuid'
import { CRS } from 'leaflet'
import L from 'leaflet'
import { when, set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import gh from 'ngeohash';
import _ from 'lodash';
import {longestCommonPrefix, recursiveGeohashSearch } from './utils/recursiveGeohashSearch'
import Promise from 'bluebird'
import * as fields from '@oada/fields-module/sequences'
import oadaMod from '@oada/cerebral-module/sequences'
import { drawTile, redrawTile } from './draw';
import { getGeohashes, simulateCombine } from './simulateCombine'
import { makeDemoWheatCO } from './makeDemoWheatCO'
import harvest from './getHarvest'

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

export const handleYieldIndexWatch = sequence('yield.handleYieldWatch', [
	// Parse out the needed data from the change
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var body = props.response.change.body;
    var geohashes = {};
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      geohashes[crop] = [];
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
          geohashes[crop].push(geohash);
          let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${crop}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
          if (!state.get(`oada.${connection_id}.watches.${path}`)) {
            state.set(`oada.${connection_id}.watches.${path}`, true);
            console.log('1 watching',geohash)
            return oada.get({
              path,
              watch: {
                signals: ['yield.handleGeohashesOnScreen'],
                payload: {
                  crop: crop,
                  geohash,
                  legend: state.get(`yield.legends.${crop}`)
                }
              },
              connection_id,
            })
          } else return
        })
			})
		}).then(() => {
      return {geohashes}
		})
  },

  mapOadaToYieldIndex,
  filterGeohashesOnScreen,
  watchGeohashesOnScreen,
])

export const fetch = sequence('yield.fetch', [
  ({props, state}) => {
    var signals = props.signals ? props.signals : [];
    return {signals: [...signals, 'yield.handleYieldIndexWatch']}
  },
	({props, state}) => ({
    path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
    connection_id: state.get('yield.connection_id'),
    tree,
    watch: {signals: props.signals},
	}),
  oadaMod.get,
  when(state`oada.${props`connection_id`}.bookmarks.notes`), {
    true: [],
    false: [
      ({props, state}) => ({
        path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
        tree,
        connection_id: props.connection_id,
        data: {},
      }),
      oadaMod.put,

      ({props, state}) => ({
        path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
        tree,
        connection_id: props.connection_id,
        watch: {signals: props.signals},
      }),
      oadaMod.get,
    ]
  },
  mapOadaToYieldIndex,
])

export const init = sequence('yield.init', [
  oadaMod.connect,
  set(state`yield.connection_id`, props`connection_id`),
 	fetch,
])

export const getPolygonStats = [
	({props}) => {
		t = Date.now();
		if (!props.ids && props.id) {
			return {
				polygons: [{
					id: props.id,
					polygon: props.polygon,
					type: props.type,
					bbox: props.bbox,
				}]
			}
		}
	},
	polygonToGeohashes,
	//	geohashesToGeojson,
	getStatsForGeohashes,
	() => {
		let d = Date.now()
		console.log((d - t)/1000)
	},
]

export const handleGeohashesOnScreen = sequence('yield.handleGeohashesOnScreen', [
  redrawTile,
]);

export const tileUnloaded = sequence('yield.tileUnloaded', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
    var geohashes = state.get(`yield.tilesOnScreen.${coordsIndex}`);
    return Promise.map(Object.keys(geohashes || {}), (geohash) => {
      if (geohash === 'coords') return
      let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${props.layer}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
      if (state.get(`oada.${connection_id}.watches.${path}`)) {
        console.log('unwatching', geohash)
        state.unset(`oada.${connection_id}.watches.${path}`)
        return oada.delete({
          path,
          unwatch: true,
          connection_id,
        })
      } else return
    }).then(()=> {
      return state.unset(`yield.tilesOnScreen.${coordsIndex}`);
    })
  },
]);

export const createTile = sequence('yield.createTile', [
	({state, props}) => ({
		index: state.get(`yield.index.${props.layer}`),
    legend: state.get(`yield.legends.${props.layer}`),
    crop: props.layer
	}),
	drawTile,
  addGeohashesOnScreen,
  watchGeohashesOnScreen,
])

function filterGeohashesOnScreen({state, props, oada}) {
  var tilesOnScreen = state.get(`yield.tilesOnScreen`);
  var geohashes = {};
  return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
    geohashes[crop] = [];
    return Promise.map(props.geohashes[crop], (geohash) => {
      return Promise.map(Object.keys(tilesOnScreen || {}), (coordsIndex) => {
        if (tilesOnScreen[coordsIndex][geohash]) {
          return geohashes[crop].push(geohash);
        }
        return
      })
    })
  }).then(() => {
    return {geohashes}
  })
}

function watchGeohashesOnScreen({state, props, oada}) {
  var connection_id = state.get('yield.connection_id');
  return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
    var index = state.get(`yield.index.${crop}`);
    var geohashes = props.geohashes[crop].filter((geohash) => { 
      if (!index['geohash-'+geohash.length]) return false 
      return (index['geohash-'+geohash.length][geohash]) ? true : false;
    }) 
    return Promise.map(geohashes, (geohash) => {
      let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${props.crop}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
      if (!state.get(`oada.${connection_id}.watches.${path}`)) {
        state.set(`oada.${connection_id}.watches.${path}`, true);
        console.log('2 watching', geohash)
        return oada.get({
          path,
          watch: {
            signals: ['yield.handleGeohashesOnScreen'],
            payload: {
              crop: props.crop,
              geohash,
              legend: state.get(`yield.legends.${props.crop}`)
            }
          },
          connection_id,
        })
      } else return
    })
  }).then(() => {return;})
}

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

export const runLiveDataClicked = sequence('yield.runLiveDataClicked', [
  // First, delete some data
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id')
    return oada.delete({
      path: '/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/wheat',
      connection_id
    }).then(() => {
      return oada.delete({
        path: '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/wheat',
        connection_id
      })
    })
  },

  ({state, props, oada}) => {
     var req = new XMLHttpRequest()
    req.open("GET", "/flow_rate3k-6k.csv", true);
    req.responseType = "text"
    req.onload = function(evt) {
      var csvData = csvjson.toObject(evt.target.response, {delimiter: ','})
      return Promise.delay(10000).then(() => {
        return makeDemoWheatCO(csvData, 0, oada, state.get('yield.connection_id'))
      })
    }
    req.send(null);
  },

  ({props, state, oada}) => {
    var req = new XMLHttpRequest()
    req.open("GET", "/flow_rate6k-9k.csv", true);
    req.responseType = "text"
    req.onload = function(evt) {
      var csvData = csvjson.toObject(evt.target.response, {delimiter: ','})
        /*
      return getGeohashes(csvData).then((geohashes) => {
        return Promise.map(Object.keys(geohashes || {}), (geohash) => {
          return oada.delete({
            path: `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/wheat/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`,
            connection_id: state.get('yield.connection_id'),
          })
        }).then(async function() {
          console.log('done deleting')
          await Promise.delay(3000)
          */
          return Promise.delay(10000).then(() => {
            return simulateCombine(csvData, 0, oada, state.get('yield.connection_id'))
          })
      //})
      // })
    }
    req.send(null);
  }
]);


  /*
// Steps when new data comes in:
// Check if the data point falls in one note or another.
function updateNoteStats({state, props, oada}) {
  let token = state.get('oada.token');
  let domain = state.get('oada.domain');
	let notes = state.get('notes.notes')
	let statsUpdates = {};
	if (props.response.change.type === 'merge') {
		return Promise.map(Object.keys(props.response.change.body['geohash-index'] || {}), (geohash) => {
			return Promise.map(Object.keys(props.response.change.body['geohash-index'][geohash]['geohash-data'] || {}), (aggregate) => {
				let newStats = props.response.change.body['geohash-index'][geohash]['geohash-data'][aggregate];
				let notesToUpdate = geohashNoteIndexManager.get(aggregate)
				if (!notesToUpdate || notesToUpdate.length === 0) return
				let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+props.crop+'/geohash-length-index/geohash-'+geohash.length+'/geohash-index/'+geohash;
				return oada.get({
					token, 
					url: domain+path
				}).then((res) => {
					let data = res['geohash-data'][aggregate];
					return Promise.map(notesToUpdate, (note) => {
						let stats = notes[note].stats[props.crop] || {                                                              
							area: {                                                                    
								sum: 0,                                                                  
								sum_of_squares: 0,                                                       
							},                                                                         
							weight: {                                                                  
								sum: 0,                                                                  
								sum_of_squares: 0,                                                       
							},                                                                         
							count: 0,                                                                  
							yield: { mean: 0, variance: 0, standardDeviation: 0},                      
							'sum-yield-squared-area': 0,                                               
						};
						if (data) {
							stats.area.sum -= data.area.sum;                                     
							stats.area.sum_of_squares -= data.area['sum-of-squares'];            
							stats.weight.sum -= data.weight.sum;                                 
							stats.weight.sum_of_squares -= data.weight['sum-of-squares'];        
							stats.count -= data.count;                                           
							stats['sum-yield-squared-area'] -= data['sum-yield-squared-area'];   
						}

						stats.area.sum += newStats.area.sum;
						stats.area.sum_of_squares += newStats.area['sum-of-squares'];
						stats.weight.sum += newStats.weight.sum;
						stats.weight.sum_of_squares += newStats.weight['sum-of-squares'];
						stats.count += newStats.count;
						stats['sum-yield-squared-area'] += newStats['sum-yield-squared-area'];

						stats.yield = {}                                                     
						stats.yield.mean = stats.weight.sum/stats.area.sum;      
						stats.yield.variance = (stats['sum-yield-squared-area']/stats.area.sum) - Math.pow(stats.yield.mean, 2);
						stats.yield.standardDeviation = Math.pow(stats.yield.variance,  0.5);
						stats['sum-yield-squared-area'] = stats['sum-yield-squared-area'];
						statsUpdates[note] = statsUpdates[note] || {};
						statsUpdates[note][props.crop] = stats;
						return stats;
					})
				})
			})
		}).then(() => {
			return {statsUpdates}
		})
	}
	return {statsUpdates}
}
*/

function updateYieldIndex({props, state}) {
	//TODO: update rev!?!?!!!? should be addressed when caching is implemented further
	Object.keys(props.response.change.body['geohash-index'] || {}).forEach((geohash) => {
		state.set(`yield.index.${props.crop}.geohash-${geohash.length}.${geohash}`, {})
	})
}

function addGeohashesOnScreen({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
	var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	state.set(`yield.tilesOnScreen.${coordsIndex}.coords`, props.coords);
  return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
	  return Promise.map(props.geohashes[crop] || [], (geohash) => {
		  state.set(`yield.tilesOnScreen.${coordsIndex}.${geohash}`, true);
      return
    })
	}).then(() => {
		return
	})
}

export function polygonToGeohashes({props}) {
	A = Date.now();
	return Promise.map((props.polygons || []), (obj) => {
		if (_.isEmpty(obj.polygon)) return Promise.resolve({
			id: obj.id,
			type: obj.type,
			bbox: obj.bbox,
			polygon: obj.polygon,
			geohashes: {},
		});
    let newPoly = _.clone(obj.polygon);
		newPoly.push(obj.polygon[0])
		//Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
		let strings = [gh.encode(obj.bbox.north, obj.bbox.west, 9),
			gh.encode(obj.bbox.north, obj.bbox.east, 9),
			gh.encode(obj.bbox.south, obj.bbox.east, 9),
			gh.encode(obj.bbox.south, obj.bbox.west, 9)];
		let commonString = longestCommonPrefix(strings);
    return recursiveGeohashSearch(newPoly, commonString, []).then((geohashes) => {
			return {
				id: obj.id,
				type: obj.type,
				bbox: obj.bbox,
				polygon: obj.polygon,
				geohashes,
			}
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

function getStatsForGeohashes({props, state, oada}) {
  C = Date.now()
  let availableGeohashes = state.get('yield.index');
	return Promise.map(props.polygons || [], (obj, i) => {
		var stats = {};
    var geohashes = {};
		return Promise.map(Object.keys(availableGeohashes || {}), (crop) => {
      return Promise.map(Object.keys(obj.geohashes || {}), async (geohash) => {
        let bucket = geohash.length > 7 ? geohash.slice(0,7) : geohash
				let ghLength = 'geohash-'+bucket.length;
				if (geohash.length < 3) {
					//TODO: handle this.  You' can't get aggregates of geohash-1 and 2
        }
        geohashes[geohash] = geohashes[geohash] || {};
        if (!availableGeohashes[crop][ghLength] || !availableGeohashes[crop][ghLength][bucket]){
          let ret = {bucket: null}
          if (typeof obj.geohashes[geohash] === 'object') ret.aggregates = obj.geohashes[geohash];
          return geohashes[geohash][crop] = ret;
        }
        let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+bucket.length+'/geohash-index/'+bucket;
        return oada.get({
          connection_id: state.get('yield.connection_id'),
          path,
        }).then((response) => {
          let data = response.data;
          geohashes[geohash][crop] = {
            bucket: {
              _id: response.headers['content-location'].replace(/^\//,''),
              _rev: response.headers['x-oada-rev']
            }
          }
          if (geohash.length > 7) {
            if (typeof obj.geohashes[geohash] === 'object') geohashes[geohash].aggregates = obj.geohashes[geohash];
            return Promise.map(Object.keys(obj.geohashes[geohash] || {}), (geohash) => {
              let ghData = data[geohash];
              if (!ghData) return
              stats[crop] = harvest.recomputeStats(stats[crop], ghData)
              return
            })
          }
          let ghData = data.stats;
          if (!ghData) return
          stats[crop] = harvest.recomputeStats(stats[crop], ghData)
          return
        }).catch((err) => {
          let ret = {bucket: null}
          if (typeof obj.geohashes[geohash] === 'object') ret.aggregates = obj.geohashes[geohash];
          return geohashes[geohash][crop] = ret;
        })
			}, {concurrency: 10}).then(() => {
        stats[crop] = stats[crop] || {};
        stats[crop] = harvest.recomputeStats(stats[crop])
				if (stats[crop].count === 0) delete stats[crop]
				return
			})
		}, {concurrency: 10}).then(() => {
			return {
				id: obj.id,
				type: obj.type,
				bbox: obj.bbox,
        polygon: obj.polygon,
        geohashes,
				stats
			}
		})
  }, {concurrency: 10}).then((polygons) => {
    console.log('C', (Date.now() - C)/1000);
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
