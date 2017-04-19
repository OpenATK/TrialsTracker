import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral/react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';
import Control from 'react-leaflet-control';

export default connect(props => ({
  editing: 'app.view.editing_note',
}), {
  undoButtonClicked: 'app.undoButtonClicked',
},

class UndoControl extends React.Component {  
  
  render() {

    return(
      <Control
        position={this.props.position}>
        <div
          disabled
          className={styles[!this.props.editing ? 'hidden' : 
            this.props.enabled ? 'undo-control' : 'undo-control-disabled']}
          onClick={() => this.props.undoButtonClicked({})}>
          <FontAwesome
            name='undo'
          />
        </div>
      </Control>
    )
  }
})
