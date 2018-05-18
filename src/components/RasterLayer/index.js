import { connect } from '@cerebral/react'
import { GridLayer} from 'react-leaflet'
import gh from 'ngeohash'
import _ from 'lodash'
import Promise from 'bluebird'
import Color from 'color'
import L from 'leaflet'
import { props, state, signal } from 'cerebral/tags'
import oadaCache from '../../modules/oada/factories/cache'
import tiles from './tileManager.js'
import { recursiveDrawOnCanvas } from './draw'
let cache = oadaCache(null, 'oada')

export default connect({
  index: state`${props`data`}`,
  geohashesToDraw: state`Map.geohashesToDraw.${props`layer`}`,
  legend: state`app.view.legends.${props`layer`}`,
  token: state`Connections.oada_token`,
  domain: state`Connections.oada_domain`,

  tileUnloaded: signal`yield.tileUnloaded`,
	newTileDrawn: signal`yield.newTileDrawn`,
},

class RasterLayer extends GridLayer {
  
	componentWillMount() {
    super.componentWillMount();
    this.leafletElement.createTile = this.createTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
//    this.drawTileGrid = this.drawTileGrid.bind(this);
//    this.drawGeohashGrid = this.drawGeohashGrid.bind(this);
		this.leafletElement.on('tileunload', this.tileUnload);
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

    if (this.props.index) {
      this.drawTile(coords, precision, tile, geohashes, done);
    }

    return tile;
  }

  drawTile(coords, precision, canvas, geohashes, done) {
    var self = this;
    geohashes = geohashes.filter((geohash) => {
      return typeof(self.props.index['geohash-'+precision][geohash]) !== 'undefined';
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
