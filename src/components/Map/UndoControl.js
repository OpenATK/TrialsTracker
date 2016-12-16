import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  drawing: 'app.view.map.drawing_note_polygon',
  selectedNote: 'app.view.selected_note',
}), {
  undoButtonClicked: 'app.undoButtonClicked',
},

class UndoControl extends React.Component {  
  
  render() {
    return(
      <div>
        <Control
          position={this.props.position}>
          <FontAwesome
            name='undo'
            className={styles[this.props.drawing ?
              'undo-button' : 'hidden']}
            onClick={() => this.props.undoButtonClicked({})}
            style={this.props.disabled ? 
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
