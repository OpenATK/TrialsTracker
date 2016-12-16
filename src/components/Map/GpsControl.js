import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  currentLocation: 'app.view.map.current_location',
}), {
  gpsButtonClicked: 'app.currentLocationButtonClicked',
},

class GpsControl extends React.Component {  

  render() {
    return(
      <div>
        <Control
          position={this.props.position}>
          <FontAwesome
            name='crosshairs'
            onClick={() => this.props.gpsButtonClicked({})}
            className={styles['gps-button']}
            style={this.props.currentLocation ? 
               { 
                color: '#000000',
                backgroundColor: '#ffffff'
              } : { 
                color: '#7b7b7b',
                backgroundColor: '#d4d4d4'
              } 
            }
          />
        </Control>
      </div>
    )
  }
})
