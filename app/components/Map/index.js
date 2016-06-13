import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { CircleMarker, Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds} from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';
var GeoJSON = require('react-leaflet').GeoJson;
import { buildImage } from './geotiffConverter.js';
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import RasterLayer from '../RasterLayer';

var tileIndex;

@Cerebral((props) => {
  return{
    notes: ['home', 'model', 'notes'],
    selectedNote: ['home', 'model', 'selected_note'],
    dragMode: ['home', 'view', 'dragMode'],
    drawMode: ['home', 'view', 'drawMode'],
    liveData: ['home', 'live_data'],
    token: ['home', 'token'],
  };
})

class _Map extends React.Component {

  componentWillMount() {
    this.timer;
  }

  render() {
    const signals = this.props.signals.home;
    var self = this;
    var position = [40.8512578, -86.138977];
    var polygonList = [];
    _.each(this.props.notes, function(note) {
      var vertices = [];
      for (var i = 0; i < note.geometry.length; i++) {
        vertices.push([note.geometry[i].longitude, note.geometry[i].latitude]);
      }
      var geojson = {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [vertices]
        }
      }
      polygonList.push(<GeoJSON 
        data={geojson} 
//        color={(note.id === self.props.selectedNote) ? "#FFFAFA" : note.color } 
        color={note.color} 
        dragging={true} 
        key={uuid.v4()}
      />);
    });

    if (this.props.drawMode) {
      var markerList = [];
      var note = this.props.notes[this.props.selectedNote];
      for (var i = 0; i < note.geometry.length; i++) {
        var geojson = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [note.geometry[i].longitude, note.geometry[i].latitude],
          }
        }  
        markerList.push(<GeoJSON 
          key={uuid.v4()} 
          data={geojson} 
//          color={(note.id === self.props.selectedNote) ? "#FFFAFA" : note.color }
          color={note.color}
          key={uuid.v4()}
        />);
      }
    }

    var drag_flag = this.props.dragMode;
//        <button type="button" id='drag-button'  onClick={(e) => signals.ToggleMapp()}>Lock Map</button>
//        <button type="button" id='draw-polygon' onClick={(e) => signals.DrawMode()}>Draw Polygon</button>
    return (
      <div id='map-panel'>
        <Map 
          onLeafletMousedown={ (e) => signals.mouseDownOnMap({pt: e.latlng, select_note: this.props.selectedNote, noteSelected:this.props.id}) } 
          onLeafletMouseMove={ (e) => signals.mouseMoveOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
          onLeafletMouseUp={ (e) => signals.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
//          onLeafletdblclick={ (e) => 
//            signals.mapDoubleClicked({pt: e.latlng, drawMode: false})
//          }
          dragging={this.props.dragMode} 
          center={position} 
          ref='map'
          zoom={17}>

          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
  
          <RasterLayer 
            url="http://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/"
            async={true}
            token={this.props.token.access_token}
          />

          <button 
            type="button" 
            id='start-stop-live-data-button'  
            onClick={(e) => signals.startStopLiveDataButtonClicked({})}
            >{this.props.liveData ? 'Stop' : 'Start' }
          </button>
          {markerList}
          {polygonList}

        </Map> 
      </div>
    );
  }
}
export default _Map;
