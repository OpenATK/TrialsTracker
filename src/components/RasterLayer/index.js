import { connect } from '@cerebral/react'
import { GridLayer} from 'react-leaflet'
import _ from 'lodash'
import Promise from 'bluebird'
import L from 'leaflet'
import { props, state, signal } from 'cerebral/tags'
import tiles from '../../modules/yield/tileManager'
import { recursiveDrawOnCanvas } from '../../modules/yield/draw'
//import * as THREE from 'three'

export default connect({
  tileUnloaded: signal`yield.tileUnloaded`,
	createTile: signal`yield.createTile`,
},

class RasterLayer extends GridLayer {
  
	componentWillMount() {
    super.componentWillMount();
    //this.scene = new THREE.Scene();
    //this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.leafletElement.createTile = this.createTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
//    this.drawTileGrid = this.drawTileGrid.bind(this);
//    this.drawGeohashGrid = this.drawGeohashGrid.bind(this);
		this.leafletElement.on('tileunload', this.tileUnload);
  }
  
//Inherited by CanvasTileLayer, this is called when a tile goes offscreen. Remove tile from tilesOnScreen
  tileUnload(evt) {
    this.props.tileUnloaded({coords:evt.coords, layer: this.props.layer});
  }

//This function is required by the CanvasTileLayer class. This is called only
//when the map is panned/zoomed and new tiles are revealed (not render). 
//Compute the geohashes needed for this tile and save the canvas reference. 
	createTile(coords) {
		let coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
		let tile = tiles.get(this.props.layer, coordsIndex);
		// If the tile is cached and its not on the list of geohashes to (re)draw,
    // return the tile
    if (tile) console.log('found tile', coordsIndex);
		if (tile) return tile;

		//Create a new tile, call a signal to draw it, and return the (empty) tile
		tile = L.DomUtil.create('canvas', 'leaflet-tile');
		tile.height = 256;                     
		tile.width = 256;
		tiles.set(this.props.layer, coordsIndex, tile)
		this.props.createTile({coords, layer: this.props.layer})
		return tile;
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
    return super.render();
  }
})
