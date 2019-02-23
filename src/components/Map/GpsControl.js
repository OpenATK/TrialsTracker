import React from 'react';
import { connect } from '@cerebral/react';
import FontAwesome from 'react-fontawesome';
import './map.css';
import Control from 'react-leaflet-control';
import { state, signal } from 'cerebral/tags'

export default connect({
  currentLocation: state`map.current_location`,

  gpsButtonClicked: signal`map.currentLocationButtonClicked`,
},

class GpsControl extends React.Component {  

  render() {
    return(
      <Control
        position={this.props.position}>
        <div
          onClick={() => this.props.gpsButtonClicked({})}
          className={this.props.currentLocation ? 
            'gps-control' : 'gps-control-disabled'}>
          <FontAwesome
            name='crosshairs'
          />
        </div>
      </Control>
    )
  }
})
