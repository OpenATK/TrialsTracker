import { connect } from '@cerebral/react'
import { GridLayer} from 'react-leaflet'
import gh from 'ngeohash'
import _ from 'lodash'
import Promise from 'bluebird'
import L from 'leaflet'
import { props, state, signal } from 'cerebral/tags'
import tiles from './tileManager.js'
import { recursiveDrawOnCanvas } from './draw'
//import * as cache from '../../providers/oada/cache.js'

export default connect({
  geohashesToDraw: state`map.geohashesToDraw.${props`layer`}`,

  tileUnloaded: signal`yield.tileUnloaded`,
	newTileDrawn: signal`yield.newTileDrawn`,
	createTile: signal`yield.createTile`,
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
	createTile(coords) {
		let coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
		let tile = tiles.get(coordsIndex);
		// If the tile is cached and its not on the list of geohashes to (re)draw,
		// return the tile
    if (tile && !this.props.geohashesToDraw[coordsIndex]) {
      return tile;
		} else {
			//Create a new tile, call a signal to draw it, and return the (empty) tile
		  tile = L.DomUtil.create('canvas', 'leaflet-tile');
			tile.height = 256;                     
			tile.width = 256;
			tiles.set(coordsIndex, tile)
			this.props.createTile({coords, layer: this.props.layer})
			return tile;
		}
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
