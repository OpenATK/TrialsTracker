import { connect } from '@cerebral/react'
import { GridLayer} from 'react-leaflet'
import gh from 'ngeohash'
import _ from 'lodash'
import Promise from 'bluebird'
import Color from 'color'
import L from 'leaflet'
import { props, state, signal } from 'cerebral/tags'
import oadaCache from '../../modules/OADA/factories/cache'
let cache = oadaCache(null, 'oada')

export default connect({
  dataIndex: state`${props`data`}`,
  geohashesToDraw: state`Map.geohashesToDraw.${props`layer`}`,
  legend: state`App.view.legends.${props`layer`}`,
  token: state`Connections.oada_token`,
  domain: state`Connections.oada_domain`,

  tileUnloaded: signal`App.tileUnloaded`,
	newTileDrawn: signal`App.newTileDrawn`,
},

class RasterLayer extends GridLayer {
  
	componentWillMount() {
    super.componentWillMount();
    this.leafletElement.createTile = this.createTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
//    this.drawTileGrid = this.drawTileGrid.bind(this);
//    this.drawGeohashGrid = this.drawGeohashGrid.bind(this);
    this.leafletElement.on('tileunload', this.tileUnload);
    this.canvas = {};
  }
  
//Inherited by CanvasTileLayer, this is called when a tile goes offscreen. Remove tile from geohashesOnScreen
  tileUnload(evt) {
    this.props.tileUnloaded({coords:evt.coords, layer: this.props.layer});
  }

//This function is required by the CanvasTileLayer class. This is called only
//when the map is panned/zoomed and new tiles are revealed (not render). 
//Compute the geohashes needed for this tile and save the canvas reference. 
  createTile(coords, done) {
    var self = this;

    var tileSwPt = new L.Point(coords.x*256, (coords.y*256)+256);
    var tileNePt = new L.Point((coords.x*256)+256, coords.y*256);
    var sw = this.context.map.unproject(tileSwPt, coords.z);
    var ne = this.context.map.unproject(tileNePt, coords.z);
    var precision = this.getGeohashLevel(coords.z, sw, ne);
    var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
    this.props.newTileDrawn({geohashes, coords, layer: this.props.layer});

    var coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
    if (this.canvas[coordsIndex] && !this.props.geohashesToDraw[coordsIndex]) {
      setTimeout(function() {
        done(null, self.canvas[coordsIndex]);
      }, 1000);
      return this.canvas[coordsIndex];
    }
    var tile = L.DomUtil.create('canvas', 'leaflet-tile');
    tile.height = 256;
    tile.width = 256;

    if (this.props.dataIndex) {
      this.drawTile(coords, precision, tile, geohashes, done);
    }

    return tile;
  }

  drawTile(coords, precision, canvas, geohashes, done) {
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
      self.canvas[coordsIndex] = canvas;
      done(null, canvas);
    })
  }

// This function recursively draws 100 yield data points
  recursiveDrawOnCanvas(coords, data, startIndex, canvas) {
      var keys = Object.keys(data);
      var self = this;
      var stopIndex = (keys.length < startIndex+200) ? keys.length : startIndex+200;
      Promise.try(function() {
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
        return canvas;
      })
      if (stopIndex !== keys.length) {
        return self.recursiveDrawOnCanvas(coords, data, stopIndex, canvas);
      } 
      return canvas;
  }

  colorForvalue(val, levels) {
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

  blendColors(c1, c2, percent) {
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

  getGeohashLevel(zoom, sw, ne) { 
    if (zoom >= 15) return 7;
    if (zoom >= 12) return 6;
    if (zoom >= 8) return 5;
    if (zoom >= 6) return 4;
    if (zoom <= 5) return 3;
  }
 // Grid lines must be drawn on top using the same canvas as the yield data.
/*
      if (self.props.geohashGridlines) {
        var bbox = gh.decode_bbox(geohash);
        var geohashesGrids = gh.bboxes(bbox[0], bbox[1], bbox[2], bbox[3], geohash.length+2);
        self.drawGeohashGrid(canvas, coords, geohashesGrids, 'black', 1);
      }
      if (self.props.tileGridlines) self.drawTileGrid(canvas, coords);
*/
      
//Render is only called when state is changed; not on map pan/zoom
  render() {
//    if (this.props.geohashesToDraw) {
/*      Promise.each(this.props.geohashesToDraw, function(geohash) {
        if (self.canvas[geohash].drawn) { //TODO: This won't work for real-time data. It will already be drawn, but we'll need to redraw it with new data!
          return null;
        } 
        self.canvas[geohash].drawn = true;
        return Promise.map(self.canvas[geohash].canvases, function(cvs, idx) {
//          return self.renderTile(cvs.canvas, geohash, cvs.coords, idx);
//
        })
      })
*/
//      Promise.each(self.tiles[z], function(tile) {
//        Object.keys(tile).forEach((geohash) => {
//          self.props.geohashesToDraw.forEach((ghToDraw) => {
//            if (geohash === ghToDraw) {
//              self.redraw();
//            }
//          })
//        })
//      })
//    }
    return super.render();
  }
})
