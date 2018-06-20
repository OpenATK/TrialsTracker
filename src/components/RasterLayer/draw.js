import Promise from 'bluebird'
import gh from 'ngeohash'
import {CRS, Transformation, latLng} from 'leaflet'
import Color from 'color'
import tiles from './tileManager.js'
import L from 'leaflet'

//export function drawTile(coords, precision, canvas, geohashes, done) {
export function drawTile({state, props, oada}) {
	let domain = state.get('oada.domain');
	let token = state.get('oada.token');
  let tileSwPt = new L.Point(props.coords.x*256, (props.coords.y*256)+256);
  let tileNePt = new L.Point((props.coords.x*256)+256, props.coords.y*256);
	let sw = CRS.EPSG3857.pointToLatLng(tileSwPt, props.coords.z);
	let ne = CRS.EPSG3857.pointToLatLng(tileNePt, props.coords.z);
  let precision = getGeohashLevel(props.coords.z, sw, ne);
	let geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
	let coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	let tile = tiles.get(props.layer, coordsIndex)

	// Only get those that we know to be available (this "available" list can also
	// be utilized to filter what is drawn).
	geohashes = geohashes.filter((geohash) => {
		if (!props.index['geohash-'+geohash.length]) return false
		return (props.index['geohash-'+geohash.length][geohash]) ? true : false;
	})
	return fetchGeohashData(tile, geohashes, oada, props.layer, props.coords, props.legend, coordsIndex, domain, token)
}

export function redrawTile({state, props, oada}) {
	let domain = state.get('oada.domain');
	let token = state.get('oada.token');
	let geohashesOnScreen = state.get(`map.geohashesOnScreen`)
	return Promise.map(Object.keys(props.change || {}), (crop) => {
		return Promise.map(Object.keys(props.change[crop] || {}), (geohash) => {
			if (!props.index['geohash-'+geohash.length]) return
			if (!props.index['geohash-'+geohash.length][geohash]) return
			return Promise.map(Object.keys(geohashesOnScreen || {}), (coordsIndex) => {
				if (!geohashesOnScreen[coordsIndex][geohash]) return
				let tile = tiles.get(props.layer, coordsIndex)
				if (!tile) return
				return fetchGeohashData(tile, [geohash], oada, crop, geohashesOnScreen[coordsIndex].coords, props.legend, coordsIndex, domain, token)
			})
		})
	}).then(() => {
		return
	})
}

export function fetchGeohashData(tile, geohashes, oada, crop, coords, legend, coordsIndex, domain, token) {
	// GET the geohashData and draw it on the canvas
	return Promise.map(geohashes, (geohash) => {
	//	return Promise.try(() => geohashes[0]).then((geohash) => {
		if (!geohash) throw new Error
		let path =	'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+(geohash.length)+'/geohash-index/'+geohash;
		return oada.get({
			url: domain+path, 
			token,
		}).then((response) => {
			return recursiveDrawOnCanvas(coords, response.data['geohash-data'], 0, tile, legend);
		}).catch((err) => {
			return
		})
	}).then(() => {
		//Save the tile and call done
		tiles.set(crop, coordsIndex, tile);
		return { geohashes }
	})}

function getGeohashLevel(zoom, sw, ne) {
  if (zoom >= 15) return 7;
  if (zoom >= 12) return 6;
  if (zoom >= 8) return 5;
  if (zoom >= 6) return 4;
  if (zoom <= 5) return 3;
}


export function recursiveDrawOnCanvas(coords, data, startIndex, canvas, legend) {
	let keys = Object.keys(data || {});
	let stopIndex = (keys.length < startIndex+200) ? keys.length : startIndex+200;
	return Promise.try(function() {
		for (let i = startIndex; i < stopIndex; i++) {
			let val = data[keys[i]];
			let ghBounds = gh.decode_bbox(keys[i]);
			let swLatLng = new latLng(ghBounds[0], ghBounds[1]);
			let neLatLng = new latLng(ghBounds[2], ghBounds[3]);
			let levels = legend;
			let sw = CRS.EPSG3857.latLngToPoint(swLatLng, coords.z);
			let ne = CRS.EPSG3857.latLngToPoint(neLatLng, coords.z);
			let w = sw.x - coords.x*256;
			let n = ne.y - coords.y*256;
			let e = ne.x - coords.x*256;
			let s = sw.y - coords.y*256;
			let width = Math.ceil(e-w);
			let height = Math.ceil(s-n);

			//Fill the entire geohash aggregate with the appropriate color
			let context = canvas.getContext('2d');
			context.lineWidth = 0;
			let col = colorForvalue(val.weight.sum/val.area.sum, levels);
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
