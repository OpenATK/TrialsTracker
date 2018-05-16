import React from 'react';
import { connect } from '@cerebral/react';
import FontAwesome from 'react-fontawesome';
import './map.css';
import Control from 'react-leaflet-control';
import { state, signal } from 'cerebral/tags'

export default connect({
  editing: state`app.view.editing`,

  undoButtonClicked: signal`map.undoButtonClicked`,
},

class UndoControl extends React.Component {  
  
  render() {

    return(
      <Control
        position={this.props.position}>
        <div
          disabled
          className={!this.props.editing ? 'hidden' : 
            this.props.enabled ? 'undo-control' : 'undo-control-disabled'}
          onClick={() => this.props.undoButtonClicked({})}>
          <FontAwesome
            name='undo'
          />
        </div>
      </Control>
    )
  }
})
