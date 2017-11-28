import React from 'react';
import { connect } from '@cerebral/react';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
const { Overlay } = LayersControl;
import './map.css';
import RasterLayer from '../RasterLayer';
import {state, signal} from 'cerebral/tags'

export default connect({
  cropLayers: state`App.view.map.crop_layers`,
  notes: state`App.model.notes`,
  selectedNote: state`App.view.selected_note`,
  editing: state`App.view.editing`,
  yieldDataIndex: state`App.model.yield_data_index`,
  fields: state`App.model.fields`,
  domain: state`Connections.oada_domain`,
	isLoading: state`App.view.map.isLoading`,

  toggleCropLayer: signal`map.toggleCropLayer`,
},

class LayerControl extends React.Component {

	render() {
    return (
      <LayersControl 
        position='topright'>
				{this.props.fields ? <Overlay 
          checked 
          name='Fields'>
					<FeatureGroup>
						{Object.keys(this.props.fields).forEach(field =>
              <GeoJSON 
                className={'field-polygon'}
                data={this.props.fields[field].boundary.geojson} 
                key={field}
							/>
						)}
          </FeatureGroup>
				</Overlay>
						: null }
        {Object.keys(this.props.yieldDataIndex || {}).map(crop => 
        <RasterLayer
          key={'RasterLayer-'+crop}
          data={'App.model.yield_data_index.'+crop}
          layer={crop}
          url={'https://'+this.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
          geohashGridlines={false}
          tileGridlines={false}
        />
      )}
      </LayersControl>
    )
  }
})
