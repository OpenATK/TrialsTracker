import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  currentLocation: 'app.model.current_location',
}), {
  gpsButtonClicked: 'app.currentLocationButtonClicked',
},

class GpsControl extends React.Component {  

  render() {
    return(
      <Control
        position={this.props.position}>
        <div
          onClick={() => this.props.gpsButtonClicked({})}
          className={styles[this.props.currentLocation ? 
            'gps-control' : 'gps-control-disabled']}>
          <FontAwesome
            name='crosshairs'
          />
        </div>
      </Control>
    )
  }
})
