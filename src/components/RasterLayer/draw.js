import Promise from 'bluebird'
import gh from 'ngeohash'
import {CRS, Transformation, latLng} from 'leaflet'
import Color from 'color'

export function recursiveDrawOnCanvas(coords, data, startIndex, canvas, legend) {
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
