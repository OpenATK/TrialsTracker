import React from 'react';
import { connect } from '@cerebral/react';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
const { Overlay } = LayersControl;
import RasterLayer from '../RasterLayer';
import {state, signal} from 'cerebral/tags'

export default connect({
  cropLayers: state`App.view.map.crop_layers`,
  yieldDataIndex: state`App.model.yield_data_index`,
  domain: state`Connections.oada_domain`,

	initialize: signal`Yield.initialize`,
  toggleCropLayer: signal`map.toggleCropLayer`,
},

class Yield extends React.Component {

	//  componentWillMount() {
	//    this.props.initialize({});
	//	}

  render() {
    console.log(this.props.yieldDataIndex)
		return (
      Object.keys(this.props.yieldDataIndex).forEach(crop => 
        <Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            data={'App.model.yield_data_index.'+crop}
            layer={crop}
            url={'https://'+self.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            token={self.props.token}
            geohashGridlines={false}
            tileGridlines={false}
          />
        </Overlay>
      )
    )
  }
})
