import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Map, TileLayer, ImageOverlay, Marker, Point } from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';

var GeoJSON = require('react-leaflet').GeoJson;

@Cerebral((props) => {
	return{
		notes: ['home', 'model', 'notes'],
		selectedNote: ['home', 'model', 'selected_note'],
		dragMode: ['home', 'view', 'dragMode'],
		drawMode: ['home', 'view', 'drawMode'],
		//note: ['home', 'model', 'notes', props.id],
	};
})

class _Map extends React.Component {

  static propTypes = {
    
  };
  
  render() {
		var position = [40.3686, -87.0909];
		var geoJSONData = [];
		var markerList = [];
		//console.log('map signals');
		//console.log(this.props);

		var highlightNoteFlag = false;
		var self = this;
		
		_.each(this.props.notes, function(note) {
			//console.log('check hightligh note');
			//console.log(this.props.selectedNote);
			//console.log(note.id);

			if(note.id === self.props.selectedNote){
				highlightNoteFlag = true;
			}
			geoJSONData.push(<GeoJSON data={note.geojson} color={(highlightNoteFlag) ? "#FFFAFA" : note.color } dragging={true} key={uuid.v4()}/>);
			//markerList.push(<Marker
			//geoJSONData.push(<GeoJSON data={note.geojson} color={note.color} key={uuid.v4()}/>)
			highlightNoteFlag = false;
		});

		
		console.log('check error');
		//console.log(this.props.signals);
		//console.log(event);
		const signals = this.props.signals.home;
    //var position = [4.418, -72.9];
		//console.log('drag flag is');
		//console.log(this.props.dragMode);
		//console.log('!!!!!!!!!!');
		//console.log('draw mode is');
		//console.log(this.props);
		var drag_flag = this.props.dragMode;
		//console.log(this.props.dragMode);

    return (
      <div id='map-panel'>
				<button type="button" id='drag-button'  onClick={(e) => signals.ToggleMapp()}>Lock Map</button>
				<button type="button" id='draw-polygon' onClick={(e) => signals.DrawMode()}>Draw Polygon</button>
        <Map 
				  onLeafletMousedown={ (e) => signals.mouseDownOnMap({vertex_value: e.latlng, select_note: this.props.selectedNote, newSelectedNote:this.props.id}) } 
				  onLeafletMouseMove={ (e) => signals.mouseMoveOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
				  onLeafletMouseUp={ (e) => signals.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
				  dragging={this.props.dragMode} 
				  center={position} 
				  zoom={13}
				>
          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
          {geoJSONData}
        </Map> 
      </div>
    );
  }
}
export default _Map;
