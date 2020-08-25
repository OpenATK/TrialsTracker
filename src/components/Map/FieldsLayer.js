import React from 'react';
import { connect } from '@cerebral/react';
import './map.css';
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import {state, signal} from 'cerebral/tags'
const { Overlay } = LayersControl;

export default connect({
  fields: state`notes.fields`,
  layers: state`map.layers`,

	noteClicked: signal`notes.noteClicked`,
},

class FieldsOverlay extends React.Component {

	render() {
	  console.log('arg!!! rerendering', this.props.fields);

    return (
        <FeatureGroup>
          {Object.values(this.props.fields || {}).map(val =>
            val.boundary 
            && val.boundary.geojson 
            && val.boundary.geojson.coordinates[0].length > 0 ?
          <GeoJSON 
            className={'field-polygon'}
            onClick={() => this.props.noteClicked({id:val.id, noteType: 'fields'})}
            color={val.color} 
            style={{color: val.color}}
            data={val.boundary.geojson} 
            key={val.id}
          /> : null )}
       </FeatureGroup>
    )
  }
})
