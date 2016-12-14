import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';

export default connect(props => ({
  
}), {
  gpsButtonClicked: 'app.currentLocationButtonClicked',
},

class GpsControl extends MapControl {  

  componentWillMount() {
    const gpsControl = L.control({position: 'topleft'});
    const jsx = (
      <div>
        <FontAwesome
          name='crosshairs'
          onClick={() => this.props.gpsButtonClicked({})}
          className={styles['gps-button']}
          style={this.props.disabled ? 
            { 
              color: '#7b7b7b',
              backgroundColor: '#d4d4d4'
            } : { 
              color: '#000000',
              backgroundColor: '#ffffff'
            } 
          }
        />
      </div>
    );

    gpsControl.onAdd = function (map) {
      let div = L.DomUtil.create('div', 'gps-control');
      ReactDOM.render(jsx, div);
      return div;
    };

    this.leafletElement = gpsControl;
  }
})
