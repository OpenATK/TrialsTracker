import Promise from 'bluebird'
import gh from 'ngeohash'
import {CRS, Transformation, latLng} from 'leaflet'
import Color from 'color'
import tiles from './tileManager.js'
import L from 'leaflet'

// Get geohash->tile index and call fetchGeohashData
export async function drawTile({state, actions, effects}, props) {
  var connection_id = state.yield.connection_id;
  var tilesOnScreen = state.yield.tilesOnScreen;
  var legends = state.yield.legends;
  var coordsIndex;
  if (props.coords) coordsIndex = [props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString()];
  return Promise.map(coordsIndex || Object.keys(tilesOnScreen || {}), (coordsIndex) => {
    return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
      var index = state.yield.index[crop];
      var filtGeohashes = props.geohashes[crop].filter(geohash => 
        index['geohash-'+geohash.length] && index['geohash-'+geohash.length][geohash]
      )
      return Promise.map(filtGeohashes, (geohash) => {
        if (!tilesOnScreen[coordsIndex][geohash]) return
        var tile = tiles.get(crop, coordsIndex)
        if (!tile) return
        var path =	'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+(geohash.length)+'/geohash-index/'+geohash;
        var body = (props.response && props.response.change.body['geohash-data']) ? {data:props.response.change.body} : undefined;
        return actions.yield.fetchGeohashData({tile, path, geohash, crop, coords: tilesOnScreen[coordsIndex].coords, legend: legends[crop], coordsIndex, connection_id, body}).then(() => {
          state.oada[connection_id].watches[path] = true;
          var pieces = coordsIndex.split('-');
          return tiles.set(crop, coordsIndex, tile);
        }, {concurrency: 10})
      })
    })
  }).then(() => {
    return
  })
}

// Fetch the data to be rendered. At the same time, setup a watch.
// GET/cache misses will clear that geohash data from the tile canvas (for delete
// case)
export async function fetchGeohashData({state, actions, effects}, {tile, path, geohash, crop, coords, legend, coordsIndex, connection_id, data}) {
  try {
    var response = data ? data : await effects.oada.get({
      connection_id: connection_id,
      path, 
      watch: {
        actions: actions.yield.handleGeohashesOnScreen,
        payload: {
          geohashes: {[crop]: [geohash]},
        }
      }
    })
    return recursiveDrawOnCanvas(coords, response.data['geohash-data'], 0, tile, legend);
  } catch(err) {
    var ghBounds = gh.decode_bbox(geohash);
    var swLatLng = new latLng(ghBounds[0], ghBounds[1]);
    var neLatLng = new latLng(ghBounds[2], ghBounds[3]);
    var sw = CRS.EPSG3857.latLngToPoint(swLatLng, coords.z);
    var ne = CRS.EPSG3857.latLngToPoint(neLatLng, coords.z);
    var w = sw.x - coords.x*256;
    var n = ne.y - coords.y*256;
    var e = ne.x - coords.x*256;
    var s = sw.y - coords.y*256;
    var width = Math.ceil(e-w);
    var height = Math.ceil(s-n);
    //Fill the entire geohash aggregate with the appropriate color
    var context = tile.getContext('2d');
    context.lineWidth = 0;
    context.beginPath();
    context.clearRect(w, n, width, height);
    //			context.fillStyle = "rgba(0, 0, 0, 0)";
    //      context.fill();
    return
  }
}

function getGeohashLevel(zoom, sw, ne) {
  if (zoom >= 15) return 7;
  if (zoom >= 12) return 6;
  if (zoom >= 8) return 5;
  if (zoom >= 6) return 4;
  if (zoom <= 5) return 3;
}


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
			context.fillStyle = Color(col).hex();
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
	for (var i = 0; i < levels.length-1; i++) {
		var bottom = levels[i];
		var top = levels[i+1];
		if (val > bottom.value && val <= top.value) {
			var percentIntoRange = (val - bottom.value) / (top.value - bottom.value);
			return blendColors(top.color, bottom.color, percentIntoRange);
		}
	}

	console.log('ERROR: val = ', val, ', but did not find color!');
	return null;
}

function blendColors(c1, c2, percent) {
//    var a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
//    var a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
	return {
		r: c1.r * percent + c2.r * (1-percent),
		g: c1.g * percent + c2.g * (1-percent),
		b: c1.b * percent + c2.b * (1-percent),
		alpha: 0.9999,
//      a:   a1 * percent +   a2 * (1-percent),
	};
}

export async function geohashesFromTile({state}, props) {
 	var connection_id = state.yield.connection_id;
  var tileSwPt = new L.Point(props.coords.x*256, (props.coords.y*256)+256);
  var tileNePt = new L.Point((props.coords.x*256)+256, props.coords.y*256);
	var sw = CRS.EPSG3857.pointToLatLng(tileSwPt, props.coords.z);
	var ne = CRS.EPSG3857.pointToLatLng(tileNePt, props.coords.z);
  var precision = getGeohashLevel(props.coords.z, sw, ne);
	var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
  return { geohashes: {[props.layer]: geohashes}}
}
