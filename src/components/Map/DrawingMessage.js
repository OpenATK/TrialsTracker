import React from 'react';
import { connect } from 'cerebral/react';
import './map.css';
import Control from 'react-leaflet-control';
import { state } from 'cerebral/tags'

export default connect({
  editing: state`app.view.editing`,
},

class DrawingMessage extends React.Component {  

  render() {
    return (
      <Control
        position={this.props.position}>
        <div
          className={(this.props.editing) ? 
            'drawing-message-control' : 'hidden'}>
          Tap on the map to draw a polygon...
        </div>     
      </Control>
    ) 
  }
})
