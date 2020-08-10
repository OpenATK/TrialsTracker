import { GridLayer} from 'react-leaflet'
import React from "react";
import overmind from "../../overmind"
import gh from 'ngeohash'
import _ from 'lodash'
import Promise from 'bluebird'
import Color from 'color'
import L from 'leaflet'
import oadaCache from '../../modules/OADA/factories/cache'
import tiles from './tileManager.js'
let cache = oadaCache(null, 'oada')

export default function RasterLayer(props) {
  const { actions, state } = overmind();
  const myState = state.view.Yield;
  const myActions = actions.view.Yield;
  //let dataIndex = state[props.data];
  let geohashesToDraw = state.view.Map.geohashesToDraw[props.layer];
  let legend = state.App.view.legends[props.layer];
  let token = state.Connections.oada_token;
  let domain = state.Connections.oada_domain;

  return (
    <div />
  )
}

//class RasterLayer extends GridLayer {
  
	function componentWillMount() {
    //TODO: put this back in
    //super.componentWillMount();
    this.leafletElement.createTile = this.createTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
		this.leafletElement.on('tileunload', this.tileUnload);
  }
  
//Inherited by CanvasTileLayer, this is called when a tile goes offscreen. Remove tile from geohashesOnScreen
  function tileUnload(evt) {
    //myActions.tileUnloaded({coords:evt.coords, layer: this.props.layer});
  }

//This function is required by the CanvasTileLayer class. This is called only
//when the map is panned/zoomed and new tiles are revealed (not render). 
//Compute the geohashes needed for this tile and save the canvas reference. 
  function createTile(coords, done) {
    var self = this;

    var tileSwPt = new L.Point(coords.x*256, (coords.y*256)+256);
    var tileNePt = new L.Point((coords.x*256)+256, coords.y*256);
    var sw = this.context.map.unproject(tileSwPt, coords.z);
    var ne = this.context.map.unproject(tileNePt, coords.z);
    var precision = this.getGeohashLevel(coords.z, sw, ne);
    var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
    //myActions.newTileDrawn({geohashes, coords, layer: this.props.layer});

		var coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
		var tile = tiles.get(coordsIndex);
    if (tile && !this.props.geohashesToDraw[coordsIndex]) {
      setTimeout(function() {
        done(null, tile);
      }, 1000);
      return tile;
    }
    tile = L.DomUtil.create('canvas', 'leaflet-tile');
    tile.height = 256;
    tile.width = 256;

    if (this.props.dataIndex) {
      this.drawTile(coords, precision, tile, geohashes, done);
    }

    return tile;
  }

  function drawTile(coords, precision, canvas, geohashes, done) {
    var self = this;
    geohashes = geohashes.filter((geohash) => {
      return typeof(self.props.dataIndex['geohash-'+precision][geohash]) !== 'undefined';
    })
		return Promise.map(geohashes, (geohash) => {
			let resPath =	'/harvest/tiled-maps/dry-yield-map/crop-index/'+this.props.layer+'/geohash-length-index/geohash-'+(geohash.length)+'/geohash-index/'+geohash.substring(0, geohash.length)+'/geohash-data/';
			return cache.get(this.props.domain, this.props.token, resPath).then((data) => {
        return self.recursiveDrawOnCanvas(coords, data, 0, canvas);
      })
    }).then((res) => {
      var coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
      tiles.set(coordsIndex, canvas);
      done(null, canvas);
    })
  }

// This function recursively draws 100 yield data points
  function recursiveDrawOnCanvas(coords, data, startIndex, canvas) {
		var keys = Object.keys(data);
		var self = this;
		var stopIndex = (keys.length < startIndex+200) ? keys.length : startIndex+200;
		return Promise.try(function() {
			for (var i = startIndex; i < stopIndex; i++) {
				var val = data[keys[i]];
				var ghBounds = gh.decode_bbox(keys[i]); 
				var swLatLng = new L.latLng(ghBounds[0], ghBounds[1]);
				var neLatLng = new L.latLng(ghBounds[2], ghBounds[3]);
				var levels = self.props.legend;
				var sw = self.context.map.project(swLatLng, coords.z);
				var ne = self.context.map.project(neLatLng, coords.z);
				var w = sw.x - coords.x*256;
				var n = ne.y - coords.y*256;
				var e = ne.x - coords.x*256;
				var s = sw.y - coords.y*256;
				var width = Math.ceil(e-w);
				var height = Math.ceil(s-n);

				//Fill the entire geohash aggregate with the appropriate color
				var context = canvas.getContext('2d');
				context.lineWidth = 0;
				var col = self.colorForvalue(val.weight.sum/val.area.sum, levels);
				context.beginPath();
				context.rect(w, n, width, height);
				context.fillStyle = Color(col).hexString();
				context.fill();
			}
			if (stopIndex !== keys.length) {
				return self.recursiveDrawOnCanvas(coords, data, stopIndex, canvas);
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
        return this.blendColors(top.color, bottom.color, percentIntoRange);
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

  function getGeohashLevel(zoom, sw, ne) { 
    if (zoom >= 15) return 7;
    if (zoom >= 12) return 6;
    if (zoom >= 8) return 5;
    if (zoom >= 6) return 4;
    if (zoom <= 5) return 3;
  }
