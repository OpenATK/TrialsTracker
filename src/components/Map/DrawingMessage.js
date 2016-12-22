import React from 'react';
import { connect } from 'cerebral-view-react';
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
      <Control
        position={this.props.position}>
        <div
          className={styles[(this.props.drawing) ? 
            'drawing-message-control' : 'hidden']}>
          Tap on the map to draw a polygon...
        </div>     
      </Control>
    ) 
  }
})
