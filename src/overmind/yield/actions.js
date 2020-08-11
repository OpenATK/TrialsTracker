import Promise from 'bluebird'
import geohashNoteIndexManager from './utils/geohashNoteIndexManager.js';
import oadaCache from '../../modules/OADA/factories/cache';
//import recursiveGet from '../../OADA/factories/recursiveGet'

import tiles from '../../components/RasterLayer/tileManager.js';
import gh from 'ngeohash'
import {CRS, Transformation, latLng} from 'leaflet'
import Color from 'color'

let cache = oadaCache(null, 'oada');

export default {

}

let getOadaYieldData = [
  getYieldDataIndex, {
		success: [
			setYieldDataIndex,
			watchYieldDataIndex, {
				success: [],
				error: [],
			},
		],
    error: [],
	}
]

let initializeYield = [
  getYieldDataIndex, {
    success: [setYieldDataIndex],
    error: [],
	}
]

let dataReceived = [
	updateYieldDataIndex,
	updateNoteStats, {
		success: [
			setNoteStats,
			updateYieldTiles, {
				success: [],
				error: []
			},
		],
		error: [],
	},
]

var removeGeohashes = [
  unregisterGeohashes,
];

var addGeohashes = [
	registerGeohashes,
	/*	registerWatches, {
		success: [],
		error: []
	}*/
];

function setNoteStats({state, path, props, oada}) {
	Object.keys(props.statsUpdates).forEach((note) => {
		Object.keys(props.statsUpdates[note]).forEach((crop) => {
			state.set(`Note.notes.${note}.stats.${crop}`, props.statsUpdates[note][crop]);
		})
	})
}

function updateNoteStats({state, path, props, oada}) {
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
	let notes = state.get('Note.notes')
	let statsUpdates = {};
	if (props.response.change.type === 'merge') {
		return Promise.map(Object.keys(props.response.change.body['geohash-index'] || {}), (geohash) => {
			return Promise.map(Object.keys(props.response.change.body['geohash-index'][geohash]['geohash-data'] || {}), (aggregate) => {
				let newStats = props.response.change.body['geohash-index'][geohash]['geohash-data'][aggregate];
				let notesToUpdate = geohashNoteIndexManager.get(aggregate)
				if (!notesToUpdate || notesToUpdate.length == 0) return
				let url = '/harvest/tiled-maps/dry-yield-map/crop-index/'+props.crop+'/geohash-length-index/geohash-'+geohash.length+'/geohash-index/'+geohash;
				return cache.get(domain, token, url).then((res) => {
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
			return path.success({statsUpdates})
		})
	}
	return path.success({statsUpdates})
}

function updateYieldDataIndex({props, state, path}) {
	//TODO: update rev!?!?!!!? should be addressed when caching is implemented further
	Object.keys(props.response.change.body['geohash-index'] || {}).forEach((geohash) => {
		state.set(`Yield.data_index.${props.crop}.geohash-${geohash.length}.${geohash}`, {})
	})
}

function registerGeohashes({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
	let coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	props.geohashes.forEach((gh) => {
		state.set(`Map.geohashesOnScreen.${props.layer}.${gh}.${coordsIndex}`, {
			coords: props.coords
		});
	})
}

function registerWatches({props, state, oada, path}) {
	if (oada.watch) {
		let token = state.get('Connections.oada_token');
		let domain = state.get('Connections.oada_domain');
	// This case occurs before a token is available. Just save all geohashes and
	// filter them later when the list of available geohashes becomes known.
		let coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
		return Promise.map(props.geohashes, (geohash) => {
			let url = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+props.layer+'/geohash-length-index/geohash-'+geohash.length.toString()+'/geohash-index/'+geohash;
			return oada.watch({
				url,
				headers: { 'Authorization': 'Bearer '+token},
			}, 'Yield.dataReceived', {
				coordsIndex,
				crop: props.crop, 
				ghLen: 'geohash-'+geohash.length.toString(),
				geohash
			})
		}).then(() => {
			return path.success({})
		}).catch((error) => {
			console.log(error)
			return path.error({error})
		})
	} else {
		return path.error({})
	}
}

function unregisterGeohashes({props, state}) {
  var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
  state.unset(`Map.geohashesOnScreen.${props.layer}.${coordsIndex}`);
}

function getYieldDataIndex({state, path, oada}) {
  let token = state.get('Connections.oada_token');
	let domain = state.get('Connections.oada_domain');
  let setupTree = {
	  harvest: {
	  	'_type': "application/vnd.oada.harvest.1+json",
		  'tiled-maps': {
		  	'_type': "application/vnd.oada.tiled-maps.1+json",
		  	'dry-yield-map': {
		  		'_type': "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
		  		'crop-index': {
		  			'*': {
		  		    "_type": "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
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
  }
  /*
	return recursiveGet.func(arguments)({
		domain, 
		token, 
		path:'', 
		setupTree, 
		headers: {},
		websocket: oada
	}).then((data) => {
		return path.success(data)
	}).catch((err) => {
		console.log(err)
    return path.error({error: err})
	})
  */
}

function setYieldDataIndex({props, state}) {
  if (props.harvest) {
		Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index']).forEach((crop) => {
      state.set(`Map.crop_layers.${crop}`, {visible: true});
      state.set(`Map.geohashesToDraw.${crop}`, {});
      state.set(`Yield.data_index.${crop}`, {});
			Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index']).forEach((ghLength) => {
				state.set(`Yield.data_index.${crop}.${ghLength}`, props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index']);
      })
    })
  }
}

function watchYieldDataIndex({state, path, props, oada}) {
  let token = state.get('Connections.oada_token');
	let domain = state.get('Connections.oada_domain');
	if (props.harvest) {
		return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
			return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'] || {}), (ghLen) => {
				let url = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/'+ghLen;
        return oada.watch({
					url,
      		headers: {Authorization: 'Bearer '+token},
				}, 'Yield.dataReceived', {crop, ghLen})
			})
		}).then(() => {
		  return path.success({})
	  }).catch((err) => {
		  console.log(err)
      return path.error({error: err})
		})
	} 
	return path.success({})
}

function updateYieldTiles({state, path, props, oada}) {
	let legend = state.get(`App.view.legends.${props.crop}`);
	let geohashesOnScreen = state.get(`Map.geohashesOnScreen.${props.crop}`);
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
			return path.success({})
		})
	} 
	if (props.response.change.type === 'delete') {
    Object.keys(props.response.delete['geohash-length-index'][props.ghLen]['geohash-index']).forEach((geohash) => {
			state.set(`Yield.data_index.${props.crop}.${props.ghLen}.${geohash}`, {
				'_id': props.response.resourceId,
				'_rev': props.response.delete['geohash-length-index'][props.ghLen]['geohash-index'][geohash]._rev
			})
		})
	}
}
	/*
// Set new rev to induce a cache update
state.set(`Yield.data_index.${props.crop}.${props.ghLen}.${geohash}`, {
	'_id': props.response.resourceId,
	'_rev': props.response.change.body['geohash-index'][geohash]._rev
})
*/

function recursiveDrawOnCanvas(coords, data, startIndex, canvas, legend) {
	var keys = Object.keys(data || {});
	var stopIndex = (keys.length < startIndex+200) ? keys.length : startIndex+200;
	return Promise.try(function() {
		for (var i = startIndex; i < stopIndex; i++) {
			var val = data[keys[i]];
			var ghBounds = gh.decode_bbox(keys[i]);
			var swLatLng = new latLng(ghBounds[0], ghBounds[1]);
			var neLatLng = new latLng(ghBounds[2], ghBounds[3]);
			var levels = legend;
			var sw = CRS.EPSG3857.latLngToPoint(swLatLng, coords.z);
			var ne = CRS.EPSG3857.latLngToPoint(neLatLng, coords.z);
			var w = sw.x - coords.x*256;
			var n = ne.y - coords.y*256;
			var e = ne.x - coords.x*256;
			var s = sw.y - coords.y*256;
			var width = Math.ceil(e-w);
			var height = Math.ceil(s-n);

			//Fill the entire geohash aggregate with the appropriate color
			var context = canvas.getContext('2d');
			context.lineWidth = 0;
			var col = colorForvalue(val.weight.sum/val.area.sum, levels);
			context.beginPath();
			context.rect(w, n, width, height);
			context.fillStyle = Color(col).hexString();
			context.fill();
		}
		if (stopIndex !== keys.length) {
			return recursiveDrawOnCanvas(coords, data, stopIndex, canvas, legend);
		}

		return canvas;
	})
}

function colorForvalue(val, levels) {
	if (val <= levels[0].value) {
		return levels[0].color;
	}
	if (val >= levels[levels.length-1].value) {
		return levels[levels.length-1].color;
	}
	for (let i = 0; i < levels.length-1; i++) {
		let bottom = levels[i];
		let top = levels[i+1];
		if (val > bottom.value && val <= top.value) {
			let percentIntoRange = (val - bottom.value) / (top.value - bottom.value);
			return blendColors(top.color, bottom.color, percentIntoRange);
		}
	}

	console.log('ERROR: val = ', val, ', but did not find color!');
	return null;
}

function blendColors(c1, c2, percent) {
//    let a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
//    let a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
	return {
		r: c1.r * percent + c2.r * (1-percent),
		g: c1.g * percent + c2.g * (1-percent),
		b: c1.b * percent + c2.b * (1-percent),
		a: 0.9999,
//      a:   a1 * percent +   a2 * (1-percent),
	};
}

