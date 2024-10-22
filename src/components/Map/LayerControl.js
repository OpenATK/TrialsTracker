import React from 'react';
import { connect } from '@cerebral/react';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import './map.css';
import RasterLayer from '../RasterLayer/index.js';
import {state, signal} from 'cerebral/tags'
import uuid from 'uuid'
const { Overlay } = LayersControl;

export default connect({
  cropLayers: state`Map.crop_layers`,
  notes: state`Note.notes`,
  selectedNote: state`Note.selected_note`,
  editing: state`App.view.editing`,
  yieldDataIndex: state`Yield.data_index`,
  fields: state`Fields`,
  domain: state`Connections.oada_domain`,
	isLoading: state`Map.isLoading`,
	geohashPolygons: state`Map.geohashPolygons`,

  toggleCropLayer: signal`Map.toggleCropLayer`,
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
				{Object.keys(this.props.yieldDataIndex || {}).map(crop => 
					<Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            data={'Yield.data_index.'+crop}
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
