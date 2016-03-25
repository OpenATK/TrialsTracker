import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Map, TileLayer, ImageOverlay } from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';

var GeoJSON = require('react-leaflet').GeoJson;

@Cerebral((props) => {
	return{
		notes: ['home', 'model', 'notes'],
		selectedNote: ['home', 'model', 'selected_note'],
		//note: ['home', 'model', 'notes', props.id],
	};
})

class _Map extends React.Component {

  static propTypes = {
    
  };
  
  render() {
    var position = [40.50000, -87.666666];
    var geoJSONData = [];
    _.each(this.props.notes, function(note) {
      geoJSONData.push(<GeoJSON data={note.geojson} color={note.color} key={uuid.v4()}/>);
    });
    
    var testData = {
      "dp1wmhg1d": {
        lat: 40.500000,
        lon: -87.666666,
        val: 15
      },
      "dp1wmhg19": {
        lat: 40.500004,
        lon: -87.666714,
        val: 12
      },
      "dp1wmhg13": {
        lat: 40.499961,
        lon: -87.666714,
        val: 17
      },
      "dp1wmhg16": {
        lat: 40.499961,
        lon: -87.666671,
        val: 18
      }
    };

    var geoj = {
      "type":"FeatureCollection",
      "features":[{
        "type":"Feature",
        "geometry": {
          "type":"MultiPolygon",
          "coordinates": [[[
            [-87.666666, 40.500000], 
            [-87.666714, 40.500004], 
            [-87.666714, 40.499961], 
            [-87.666671, 40.499961]
          ]]]
        },
      }]
    }

    var b = _(testData).filter('val').reduce(function(a,m,i,p) {
      return a + m.val/p.length;
    },0);

    const signals = this.props.signals.home;

    return (
      <div id='map-panel'>
        <Map onLeafletMousedown={(e) => {signals.mouseDownOnMap({vertex_value: e.latlng, select_note: this.props.selectedNote, newSelectedNote:this.props.id})}} dragging={false} center={position} zoom={13}>
          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
          {geoJSONData}
          <ImageOverlay
            url={om}
            bounds={[[4.418, -72.91],[4.5935, -72.7814]]}
          />
        </Map> 
      </div>
    );
  }
}
export default _Map;
