import React from 'react';
import { connect } from 'cerebral-view-react';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';

export default connect(props => ({
  currentLocation: 'app.model.current_location',
}), {
  gpsButtonClicked: 'app.currentLocationButtonClicked',
},

class GpsButton extends React.Component {  

  render() {
    return(
      <div
        <FontAwesome
          name='crosshairs'
        onClick={() => this.props.gpsButtonClicked({})}
        className={styles[this.props.currentLocation ? 
          'gps-control' : 'gps-control-disabled']}
        />
    )
  }
})
