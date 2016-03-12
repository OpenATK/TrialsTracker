import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Map, TileLayer, ImageOverlay } from 'react-leaflet';
import styles from './map.css';
import om from '../../images/om.png';
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
		var position = [40.3686, -87.0909];
		var geoJSONData = [];
		//console.log('map signals');
		//console.log(this.props.notes);

		//var self = this;
		_.each(this.props.notes, function(note) {
			geoJSONData.push(<GeoJSON data={note.geojson} color={note.color} key={uuid.v4()}/>);
		});

		//console.log('check error');
		//console.log(this.props.signals);
		//console.log(event);
		const signals = this.props.signals.home;
    //var position = [4.418, -72.9];

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

