import getYieldDataIndex from './actions/getYieldDataIndex'
import setYieldDataIndex from './actions/setYieldDataIndex'
import watchYieldDataIndex from './actions/watchYieldDataIndex'
import updateYieldTiles from './actions/yieldDataReceived'
import Promise from 'bluebird'
import geohashNoteIndexManager from './utils/geohashNoteIndexManager.js';
import oadaCache from '../../modules/OADA/factories/cache';
let cache = oadaCache(null, 'oada');

export let getOadaYieldData = [
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

export let initializeYield = [
  getYieldDataIndex, {
    success: [setYieldDataIndex],
    error: [],
	}
]

export let dataReceived = [
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

export var removeGeohashes = [
  unregisterGeohashes,
];

export var addGeohashes = [
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
