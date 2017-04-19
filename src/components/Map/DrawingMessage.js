import React from 'react';
import { connect } from 'cerebral/react';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  editing: 'app.view.editing_note',
}), {
},

class DrawingMessage extends React.Component {  

  render() {
    return (
      <Control
        position={this.props.position}>
        <div
          className={styles[(this.props.editing) ? 
            'drawing-message-control' : 'hidden']}>
          Tap on the map to draw a polygon...
        </div>     
      </Control>
    ) 
  }
})
