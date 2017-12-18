import React from 'react';
import { connect } from '@cerebral/react';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
const { Overlay } = LayersControl;
import './map.css';
import RasterLayer from '../RasterLayer';
import {state, signal} from 'cerebral/tags'

export default connect({
  cropLayers: state`Map.crop_layers`,
  notes: state`Note.notes`,
  selectedNote: state`Note.selected_note`,
  editing: state`App.view.editing`,
  yieldDataIndex: state`Yield.data_index`,
  fields: state`Fields`,
  domain: state`Connections.oada_domain`,
	isLoading: state`Map.isLoading`,

  toggleCropLayer: signal`Map.toggleCropLayer`,
},

class LayerControl extends React.Component {

	render() {

    return (
      <LayersControl 
        position='topright'>
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
            url={'https://'+this.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            geohashGridlines={false}
            tileGridlines={false}
					/>
				</Overlay>
      )}
      </LayersControl>
    )
  }
})
