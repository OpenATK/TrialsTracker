import { sequence } from 'cerebral'
import csvjson from 'csvjson'
import uuid from 'uuid'
import { CRS } from 'leaflet'
import L from 'leaflet'
import { set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import gh from 'ngeohash';
import _ from 'lodash';
import {longestCommonPrefix, recursiveGeohashSearch } from './utils/recursiveGeohashSearch'
import Promise from 'bluebird'
import * as fields from '../fields/sequences';
import * as oadaMod from '@oada/cerebral-module/sequences'
import { drawTile, redrawTile } from './draw';
import { getGeohashes, simulateCombine } from './simulateCombine'
import { makeDemoWheatCO } from './makeDemoWheatCO'

let t;
let A;
let C;

var tree = {
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

export const handleYieldIndexWatch = sequence('yield.handleYieldWatch', [
	// Parse out the needed data from the change
  // Also, add new geohashes to our index
  // Detect new crop showing up. 
  ({state, props, oada}) => {
    var geohashes = [];
    var id = state.get('yield.connection_id');
    var body = props.response.change.body;
    var index;
    var change = {};
    var cropType;
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      cropType = crop;
			change[crop] = {};
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
					change[crop][geohash] = geohash;
					state.set(`oada.${id}.bookmarks.harvest.tiled-maps.dry-yield-map.crop-index.${crop}.geohash-length-index.${ghLength}.geohash-index.${geohash}`, body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'][geohash])
          geohashes.push(geohash);
        })
			})
		}).then(() => {
      return {change, geohashes, index, crop: cropType}
		})
  },

  mapOadaToYieldIndex,
  ({state, props}) => ({index: state.get(`yield.index.${props.crop}`)}),
  // If its a new geohash on screen, watch it
  watchGeohashesOnScreen,
])

export const watchYieldIndex = sequence('yield.watchYieldIndex', [
	// Register a watch on geohash index
  ({state, props, oada}) => {
    var path = '/bookmarks/harvest/tiled-maps/dry-yield-map'
    if (!state.get(`oada.watches.${path}`)) {
      state.set(`oada.watches.${path}`, true);
      console.log(path, Object.keys(state.get('oada.watches')).length)
      return oada.get({
        path,
        watch: {
          signal: 'yield.handleYieldIndexWatch',
          payload: {
            uuid: uuid()
          }
        },
        connection_id: state.get('yield.connection_id')
      }).then(() => {
        var path = '/bookmarks';
        if (state.get(`oada.watches.${path}`)) {
          state.unset(`oada.watches.${path}`)
          console.log('unwatch /bookmarks', Object.keys(state.get('oada.watches')).length)
          return oada.delete({
            path,
            unwatch: true,
            connection_id: state.get('yield.connection_id')
          })
        } else return
      }).catch((err) => {
        // 404s are possible here so long as /harvest it doesn`t exist
        console.log(err)
        if (err.response.status === 404) {
          var path = '/bookmarks';
          if (state.get(`oada.watches.${path}`)) {
            state.set(`oada.watches.${path}`, true);
            console.log(path, Object.keys(state.get('oada.watches')).length)
            return oada.get({
              path,
              watch: {
                signal: 'yield.watchYieldIndex',
                payload: {
                  'watched-already': true
                }
              },
              connection_id: state.get('yield.connection_id')
            })
          } else return
        } else return
      })
    } else return
	},
])

export const fetch = sequence('yield.fetch', [
	({props, state}) => ({
		path: '/bookmarks/harvest',
    tree,
	}),
	oadaMod.get,
	mapOadaToYieldIndex,
])

export const init = sequence('yield.init', [
  set(state`yield.connection_id`, props`connection_id`),
  oadaMod.connect,
	fetch,
  watchYieldIndex
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
      if (state.get(`oada.watches.${path}`)) {
        state.unset(`oada.watches.${path}`)
        console.log('unwatch', path, Object.keys(state.get('oada.watches')).length)
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

function watchGeohashesOnScreen({state, props, oada}) {
  var connection_id = state.get('yield.connection_id');
  var geohashes = props.geohashes.filter((geohash) => { 
    if (!props.index['geohash-'+geohash.length]) return false 
    return (props.index['geohash-'+geohash.length][geohash]) ? true : false;
  }) 
  return Promise.map(geohashes, (geohash) => {
    let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${props.crop}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
    if (!state.get(`oada.watches.${path}`)) {
      state.set(`oada.watches.${path}`, true);
      console.log('watch', path, Object.keys(state.get('oada.watches')).length)
      return oada.get({
        path,
        watch: {
          signal: 'yield.handleGeohashesOnScreen',
          payload: {
            crop: props.crop,
            geohash,
            legend: state.get(`yield.legends.${props.crop}`)
          }
        },
        connection_id,
      })
    } else return
  }).then(responses => ({responses}))
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
        console.log('waited out, now starting bulk import');
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
            console.log('waited out, now starting real-time import');
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
	return Promise.map(props.geohashes || [], (gh) => {
		state.set(`yield.tilesOnScreen.${coordsIndex}.${gh}`, true);
		return
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
		return Promise.map(Object.keys(obj.geohashes || {}), (bucket) => {
			return Promise.map(Object.keys(obj.geohashes[bucket] || {}), (geohash) => {
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
			})
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
			stats[crop] = { 
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
      return Promise.map(Object.keys(obj.geohashes || {}), async (bucket) => {
				let ghLength = 'geohash-'+bucket.length;
				if (bucket.length < 3) {
					//TODO: handle this.  You' can't get aggregates of geohash-1 and 2
				}
        if (!availableGeohashes[crop][ghLength] || !availableGeohashes[crop][ghLength][bucket]){
          return geohashes[bucket] = {
            bucket: null,
            aggregates: obj.geohashes[bucket]
          }
        }
				let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+bucket.length+'/geohash-index/'+bucket;
        return oada.get({
          connection_id: state.get('yield.connection_id'),
					path,
        }).then((response) => {
          let data = response.data['geohash-data']
          geohashes[bucket] = {
            bucket: {
              _id: response.data._id,
              _rev: response.data._rev
            },
            aggregates: obj.geohashes[bucket]
          }
          return Promise.map(Object.keys(obj.geohashes[bucket] || {}), (geohash) => {
            let ghData = data[geohash];
            if (!ghData) return
            stats[crop].area.sum += ghData.area.sum;
            stats[crop].area.sum_of_squares += ghData.area['sum-of-squares'];
            stats[crop].weight.sum += ghData.weight.sum;
            stats[crop].weight.sum_of_squares += ghData.weight['sum-of-squares'];
            stats[crop].count += ghData.count;
            stats[crop]['sum-yield-squared-area'] += ghData['sum-yield-squared-area'];
            return
          })
        }).catch((err) => {
          return geohashes[bucket] = {
            bucket: null,
            aggregates: obj.geohashes[bucket]
          }
        })
			}, {concurrency: 10}).then(() => {
				stats[crop].yield = {}
				stats[crop].yield.mean = stats[crop].weight.sum/stats[crop].area.sum;
				stats[crop].yield.variance = (stats[crop]['sum-yield-squared-area']/stats[crop].area.sum) - Math.pow(stats[crop].yield.mean, 2);
				stats[crop].yield.standardDeviation = Math.pow(stats[crop].yield.variance,  0.5);
				stats[crop]['sum-yield-squared-area'] = stats[crop]['sum-yield-squared-area'];
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
