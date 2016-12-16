import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  drawing: 'app.view.map.drawing_note_polygon',
}), {
},

class DrawingMessage extends React.Component {  

  render() {
    return (
      <div>
        <Control
          position={this.props.position}>
          <div
          className={styles[(this.props.drawing) ? 
            'drawing-message' : 'hidden']}>
          Tap the map to draw a polygon
        </div>     
        </Control>
      </div>     
    ) 
  }
})
