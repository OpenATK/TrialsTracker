import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'cerebral-view-react';
import L from 'leaflet';
import { MapControl } from 'react-leaflet';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  
}), {
},

class LegendControl extends MapControl {  

  componentWillMount() {
    const legendControl = L.control({position: 'bottomright'});
    const jsx = (
      <div>
        <FontAwesome
          name='crosshairs'
          onClick={() => this.props.currentLocationButtonClicked({})}
        />
      </div>
    );

    legendControl.onAdd = function (map) {
      let div = L.DomUtil.create('div', 'legend-control');
      ReactDOM.render(jsx, div);
      return div;
    };

    this.leafletElement = legendControl;
  }
})
