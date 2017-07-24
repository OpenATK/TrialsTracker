import React from 'react';
import { connect } from 'cerebral/react';
import Leaflet from 'leaflet'
import PropTypes from 'prop-types'
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
const { Overlay } = LayersControl;
import './map.css';
import RasterLayer from '../RasterLayer';
import {state, signal} from 'cerebral/tags'

export default connect({
  cropLayers: state`app.view.map.crop_layers`,
  notes: state`app.model.notes`,
  selectedNote: state`app.view.selected_note`,
  editing: state`app.view.editing`,
  yieldDataIndex: state`app.model.yield_data_index`,
  fields: state`app.model.fields`,
  domain: state`app.settings.data_sources.yield.oada_domain`,
  isLoading: state`app.view.map.isLoading`,

  toggleCropLayer: signal`map.toggleCropLayer`,
},

class LayerControl extends React.Component {

  render() {
    let fields = [];
    let self = this;
    Object.keys(this.props.fields).forEach(function(key) {
      fields.push(<GeoJSON 
        className={'field-polygon'}
        data={self.props.fields[key].boundary.geojson} 
        key={key}
      />)
    })

    let rasterLayers = [];
    Object.keys(this.props.yieldDataIndex).forEach((crop) => {
      rasterLayers.push(
        <Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            data={'app.model.yield_data_index.'+crop}
            layer={crop}
            url={'https://'+self.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            token={self.props.token}
            geohashGridlines={false}
            tileGridlines={false}
          />
        </Overlay>
      )
    })

    return (
      <LayersControl 
        position='topright'>
        <Overlay 
          checked 
          name='Fields'>
          <FeatureGroup>
            {fields}
          </FeatureGroup>
        </Overlay>
        {rasterLayers}
      </LayersControl>
    )
  }
})
