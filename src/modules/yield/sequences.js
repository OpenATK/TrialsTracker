import { sequence } from 'cerebral'
import { CRS } from 'leaflet'
import L from 'leaflet'
import { set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import gh from 'ngeohash';
import _ from 'lodash';
import {longestCommonPrefix, recursiveGeohashSearch } from './utils/recursiveGeohashSearch'
import Promise from 'bluebird'
import geohashNoteIndexManager from './utils/geohashNoteIndexManager';
//import * as fields from '../fields/sequences';
import * as oadaMod from '../oada/sequences'
import tiles from '../../components/RasterLayer/tileManager';
import { recursiveDrawOnCanvas, drawTile, redrawTile } from '../../components/RasterLayer/draw';

let t;

let setupTree = {
	//	'_type': "application/vnd.oada.harvest.1+json",
	'tiled-maps': {
		//		'_type': "application/vnd.oada.tiled-maps.1+json",
		'dry-yield-map': {
			//			'_type': "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
			'crop-index': {
				'*': {
					//					"_type": "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
					'geohash-length-index': {
						'*': {
							'geohash-index': {
							}
						}
					}
				}
			}
		}
	}
}

//TODO: make bottom-most tiled-maps unversioned links.  Listen at the highest
// level to get your index to update
// Register for watches on the geohash tiles on screen

export const fetch = sequence('yield.fetch', [
	({props, state}) => ({
		path: '/bookmarks/harvest',
		setupTree,
	}),
	oadaMod.fetchTree,
	mapOadaToYieldIndex,
])

export const handleYieldIndexWatch = sequence('yield.fetch', [
	// Parse out the needed data from the change
	// Also, add new geohashes to our index
	({state, props}) => {
		let thing = props.response.change.body;
		console.log(thing)
		let ret = {};
		return Promise.map(Object.keys(thing['crop-index'] || {}), (crop) => {
			ret[crop] = {};
			return Promise.map(Object.keys(thing['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
				return Promise.map(Object.keys(thing['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
					ret[crop][geohash] = geohash;
					state.set(`oada.bookmarks.harvest.tiled-maps.dry-yield-map.crop-index.${crop}.geohash-length-index.${ghLength}.geohash-index.${geohash}`, geohash)
					state.set(`yield.index.${crop}.${ghLength}.${geohash}`, true)
					return
				})
			})
		}).then(() => {
			return {change: ret}
		})
	},

	({state, props}) => ({
		legend: state.get(`yield.legends.${Object.keys(props.change)[0]}`)
	}),
	redrawTile,
])

export const registerWatches = sequence('yield.registerWatches', [
	// Register a watch on geohash index
	({state, props}) => ({
		watches: {
			[state.get('oada.bookmarks.harvest.tiled-maps.dry-yield-map._id')]: {
				path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
				signalPath: 'yield.handleYieldIndexWatch'
			},
		}
	}),
	oadaMod.registerWatch,
	/*
	// Register a watch 
	({state, props}) => ({
		path: '/bookmarks/notes',
		signalPath: 'notes.handleWatchUpdate'
	}),
	// Register a watch 
	({state, props}) => ({
		path: '/bookmarks/notes',
		signalPath: 'notes.handleWatchUpdate'
	}),
	*/
])

export const init = sequence('yield.init', [
	fetch,
	registerWatches
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
	addNoteToGeohashIndex,
	getStatsForGeohashes,
	setStats,
	() => {
		let d = Date.now()
		console.log((d - t)/1000)
	},

	/*
	fields.getFieldDataForNotes,
	fields.setFieldDataForNotes,
	*/
]

export const dataReceived = [
	updateYieldIndex,
	updateNoteStats,
	setStats,
	updateYieldTiles
]

export const tileUnloaded = [
  removeGeohashesOnScreen,
];

export const createTile = [
	({state, props}) => ({
		index: state.get(`yield.index.${props.layer}`),
		legend: state.get(`yield.legends.${props.layer}`)
	}),
	drawTile,
	addGeohashesOnScreen,
]

export function mapOadaToYieldIndex({props, state}) {
	let harvest = state.get('oada.bookmarks.harvest')
  if (harvest && harvest['tiled-maps'] && harvest['tiled-maps']['dry-yield-map']) {
		return Promise.map(Object.keys(harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
      state.set(`map.crop_layers.${crop}`, {visible: true});
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

function setStats({props, state}) {
	return Promise.map(props.polygons || [], (obj) => {
		if (!_.isEmpty(obj.stats)) {
			state.set(`notes.${obj.type}.${obj.id}.stats`, obj.stats);
		}
			state.unset(`notes.${obj.type}.${obj.id}.stats.computing`);
			return obj
	}).then((polygons) => {
		return {polygons}
	})
}

export const setAllNoteStats = [
  ({state, props}) => {
  }
]

// Steps when new data comes in:
// Check if the data point falls in one note or another.
//
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

function updateYieldIndex({props, state}) {
	//TODO: update rev!?!?!!!? should be addressed when caching is implemented further
	Object.keys(props.response.change.body['geohash-index'] || {}).forEach((geohash) => {
		state.set(`yield.index.${props.crop}.geohash-${geohash.length}.${geohash}`, {})
	})
}

function addGeohashesOnScreen({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
	let coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	state.set(`map.geohashesOnScreen.${coordsIndex}.coords`, props.coords);
	return Promise.map(props.geohashes || [], (gh) => {
		state.set(`map.geohashesOnScreen.${coordsIndex}.${gh}`, true);
		return
	}).then(() => {
		return
	})
}

function removeGeohashesOnScreen({props, state}) {
  var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	state.unset(`map.geohashesOnScreen.${coordsIndex}`);
}

function addNoteToGeohashIndex({props, state}) {
	return Promise.map(props.polygons, (polygon) => {
		return Promise.map(Object.keys(polygon.geohashes || {}), (gh) => {
			geohashNoteIndexManager.set(gh, polygon.id);
			return
		})
	}).then(() => { 
		return 
	})
}

export function polygonToGeohashes({props}) {
	let a = Date.now()
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
		}).then((result) => {
			state.set(`map.geohashPolygons`, geohashPolygons)
			return obj
		})
	}).then((polygons) => {
		state.set(`map.geohashPolygons`, geohashPolygons)
		return {polygons}
	})
}

function getStatsForGeohashes({props, state, oada}) {
	let a = Date.now()
	let availableGeohashes = state.get('yield.index');
	return Promise.map(props.polygons || [], (obj) => {
		let stats = {};
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
				if (!availableGeohashes[crop][ghLength] || !availableGeohashes[crop][ghLength][bucket]) return
				let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+bucket.length+'/geohash-index/'+bucket;
				let response = await oada.get({
					token: state.get('oada.token'), 
					url: state.get('oada.domain')+path,
				})
				let data = response.data['geohash-data']
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
			}).then(() => {
				stats[crop].yield = {}
				stats[crop].yield.mean = stats[crop].weight.sum/stats[crop].area.sum;
				stats[crop].yield.variance = (stats[crop]['sum-yield-squared-area']/stats[crop].area.sum) - Math.pow(stats[crop].yield.mean, 2);
				stats[crop].yield.standardDeviation = Math.pow(stats[crop].yield.variance,  0.5);
				stats[crop]['sum-yield-squared-area'] = stats[crop]['sum-yield-squared-area'];
				if (stats[crop].count === 0) delete stats[crop]
				return
			})
		}).then(() => {
			return {
				id: obj.id,
				type: obj.type,
				bbox: obj.bbox,
				polygon: obj.polygon,
				stats
			}
		})
	}).then((polygons) => {
		return {polygons}
	})
}

export function updateYieldTiles({state, props, oada}) {
	let legend = state.get(`app.view.legends.${props.crop}`);
	let geohashesOnScreen = state.get(`map.geohashesOnScreen`);
	if (props.response.change.type === 'merge') {
		return Promise.map(Object.keys(props.response.change.body['geohash-index'] || {}), (geohash) => {
			let data = props.response.change.body['geohash-index'][geohash]['geohash-data'];
			return Promise.map(Object.keys(geohashesOnScreen[geohash] || {}), (tile) => {
				return recursiveDrawOnCanvas(geohashesOnScreen[geohash][tile].coords, data, 0, tiles.get(tile), legend).then((canvas) => {                 
					tiles.set(tiles, canvas);
					return 
				})
			})
		}).then(() => {
			return {}
		})
	} 
	if (props.response.change.type === 'delete') {
    Object.keys(props.response.delete['geohash-length-index'][props.ghLen]['geohash-index']).forEach((geohash) => {
			state.set(`yield.index.${props.crop}.${props.ghLen}.${geohash}`, {
				'_id': props.response.resourceId,
				'_rev': props.response.delete['geohash-length-index'][props.ghLen]['geohash-index'][geohash]._rev
			})
		})
	}
}
	/*
// Set new rev to induce a cache update
state.set(`yield.index.${props.crop}.${props.ghLen}.${geohash}`, {
	'_id': props.response.resourceId,
	'_rev': props.response.change.body['geohash-index'][geohash]._rev
})
*/

export function watchYieldDataIndex({state, props, oada}) {
	//  let token = state.get('Connections.oada_token');
	//let domain = state.get('Connections.oada_domain');
	/*
	if (props.harvest) {
		return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
			return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'] || {}), (ghLen) => {
				let url = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/'+ghLen;
        return oadaMod.watch({
					url,
      		headers: {Authorization: 'Bearer '+token},
				}, 'yield.dataReceived', {crop, ghLen})
			})
		}).then(() => {
		  return {}
		})
	} 
	return {}
	*/
}

function getGeohashLevel(zoom, sw, ne) {                                         
  if (zoom >= 15) return 7;                                                      
  if (zoom >= 12) return 6;                                                      
  if (zoom >= 8) return 5;                                                       
  if (zoom >= 6) return 4;                                                       
  if (zoom <= 5) return 3;                                                       
}     
