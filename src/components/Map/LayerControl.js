import React from 'react';
import { connect } from '@cerebral/react';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import './map.css';
import RasterLayer from '../RasterLayer/index.js';
import {state, signal} from 'cerebral/tags'
import uuid from 'uuid'
const { Overlay } = LayersControl;

export default connect({
  cropLayers: state`map.crop_layers`,
  notes: state`notes.notes`,
  selectedNote: state`notes.selected_note`,
	editing: state`app.view.editing`,
	//TODO: Uncomment here
  index: state`yield.index.nope`,
  fields: state`fields`,
  domain: state`Connections.oada_domain`,
	isLoading: state`map.isLoading`,
	geohashPolygons: state`map.geohashPolygons`,

  toggleCropLayer: signal`map.toggleCropLayer`,
},

class LayerControl extends React.Component {

	render() {

    return (
      <LayersControl 
				position='topright'>
				{this.props.geohashPolygons.length ? <Overlay 
          name='Geohash Polygons'>
				  <FeatureGroup>
					  {this.props.geohashPolygons.map(polygon => <GeoJSON 
              className={'geohash-polygon'}
							data={polygon} 
							style={{fillOpacity:0.0, strokeWidth: 1}}                                  
              key={uuid.v4()}
					  />)}
         </FeatureGroup>
				</Overlay> : null }

				{Object.keys(this.props.fields).length ? <Overlay 
          checked 
          name='Fields'>
				  <FeatureGroup>
					  {Object.keys(this.props.fields).map(field => <GeoJSON 
              className={'field-polygon'}
              data={this.props.fields[field].boundary.geojson} 
              key={field}
					  />)}
         </FeatureGroup>
				</Overlay> : null }
				{Object.keys(this.props.index || {}).map(crop => 
					<Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            data={'yield.index.'+crop}
            layer={crop}
            url={this.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            geohashGridlines={false}
            tileGridlines={false}
					/>
				</Overlay>
      )}
      </LayersControl>
    )
  }
})
