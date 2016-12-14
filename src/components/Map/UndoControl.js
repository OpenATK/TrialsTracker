import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';
import styles from './map.css';

export default connect(props => ({
  
}), {
  undoButtonClicked: 'app.undoButtonClicked',
},

class UndoControl extends MapControl {  

  componentWillMount() {
    const undoControl = L.control({position: 'topleft'});
    const jsx = (
      <div>
        <FontAwesome
          name='undo'
          className={styles[this.props.visible ?
            'undo-button' : 'hidden']}
          onClick={() => this.props.undoButtonClicked({})}
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

    undoControl.onAdd = function (map) {
      let div = L.DomUtil.create('div', 'undo-control');
      ReactDOM.render(jsx, div);
      return div;
    };

    this.leafletElement = undoControl;
  }
})
