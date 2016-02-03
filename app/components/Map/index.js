import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Map } from 'react-leaflet';
import { TileLayer } from 'react-leaflet';
require('./map.css');

class _Map extends React.Component {

  static propTypes = {
    
  };

  render() {
    var position = [40.3686, -87.0909];

    return (
      <div id='map-panel'>
        <Map center={position} zoom={13}>
          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
        </Map> 
      </div>
    );
  }
}
export default _Map;
