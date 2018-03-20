import getYieldDataIndex from './actions/getYieldDataIndex'
import setYieldDataIndex from './actions/setYieldDataIndex'
import watchYieldDataIndex from './actions/watchYieldDataIndex'
import yieldDataReceived from './actions/yieldDataReceived'
import Promise from 'bluebird'

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
	yieldDataReceived, {
		success: [],
		error: []
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
			console.log(url)
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
