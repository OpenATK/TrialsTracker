import overmind from '../../overmind'
import {connect} from '../../overmind'
import { GridLayer} from 'react-leaflet'
import L from 'leaflet'
import tiles from '../../overmind/yield/tileManager'
import { recursiveDrawOnCanvas } from '../../modules/yield/draw'
import { geohashesFromTile, filterGeohashes, drawTile } from '../../overmind/yield/draw';

class RasterLayer extends GridLayer {

	componentWillMount() {
    super.componentWillMount();
    this.leafletElement.createTile = this.createTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
		this.leafletElement.on('tileunload', this.tileUnload);
  }
  
//Inherited by CanvasTileLayer, this is called when a tile goes offscreen. Remove tile from tilesOnScreen
  tileUnload(evt) {
    this.props.overmind.actions.yield.tileUnloaded({coords:evt.coords, layer: this.props.layer});
  }

//This function is required by the CanvasTileLayer class. This is called only
//when the map is panned/zoomed and new tiles are revealed (not render). 
//Compute the geohashes needed for this tile and save the canvas reference. 
	createTile(coords) {
		let coordsIndex = coords.z.toString() + '-' + coords.x.toString() + '-' + coords.y.toString();
		let tile = tiles.get(this.props.layer, coordsIndex);
		// If the tile is cached and its not on the list of geohashes to (re)draw,
    // return the tile
		if (tile) return tile;

		//Create a new tile, call a signal to draw it, and return the (empty) tile
		tile = L.DomUtil.create('canvas', 'leaflet-tile');
		tile.height = 256;                     
		tile.width = 256;
		tiles.set(this.props.layer, coordsIndex, tile)
    this.props.overmind.actions.yield.createTile({coords, layer: this.props.layer})
		return tile;
  }

//Render is only called when state is changed; not on map pan/zoom
	render() {
    return super.render();
  }
}

export default connect(RasterLayer);
