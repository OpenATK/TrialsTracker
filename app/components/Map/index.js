import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Map, TileLayer, ImageOverlay } from 'react-leaflet';
import styles from './map.css';

class _Map extends React.Component {

  static propTypes = {
    
  };

  render() {
    var position = [4.418, -72.9];

    return (
      <div id='map-panel'>
        <Map center={position} zoom={11}>
          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
          <ImageOverlay
            url='/data/om.tif'
            bounds={[[4.418, -72.91],[4.5935, -72.7814]]}
          />
        </Map> 
      </div>
    );
  }
}
export default _Map;
