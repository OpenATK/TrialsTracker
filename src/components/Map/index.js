import React, { Proptypes } from 'react';
import { connect } from 'cerebral-view-react';
import { CircleMarker, Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds} from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';
var GeoJSON = require('react-leaflet').GeoJson;
import { buildImage } from './geotiffConverter.js';
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import RasterLayer from '../RasterLayer';
import Legend from '../Legend';

export default connect(props => ({
  notes: 'app.model.notes',
  selectedNote: 'app.model.selected_note',
  drawMode: 'app.view.draw_mode',
  liveData: 'app.live_data',
  token: 'app.token.access_token',
  legends: 'app.view.legends',
}), {
  toggleMap: 'app.ToggleMap',
  drawMode: 'app.drawMode',
  mouseDownOnMap: 'app.mouseDownOnMap',
  mouseMoveOnMap: 'app.mouseMoveOnMap',
  mouseUpOnMap: 'app.mouseUpOnMap',
  startStopLiveDataButtonClicked: 'app.startStopLiveDataButtonClicked',
},

  class Map extends React.Component {

    render() {
      var self = this;
      var position = [40.8512578, -86.138977];
      var polygonList = [];
      console.log(this.props);
      console.log(this.props.notes);
      Object.keys(this.props.notes).forEach(function(key) {
        var note = self.props.notes[key];
        if (note.geometry.coordinates[0].length > 0) {
          var geojson = note.geometry;
          polygonList.push(<GeoJSON 
            className={styles['note-polygon']}
            data={geojson} 
            color={note.color} 
            dragging={true} 
            key={uuid.v4()}
          />);
        }
      });
  
      var markerList = [];
      if (this.props.drawMode) {
        var note = this.props.notes[this.props.selectedNote];
        if (note.geometry.coordinates[0].length > 0) {
          var markerList = [];
          for (var i = 0; i < note.geometry.coordinates[0].length; i++) {
            var geojson = {
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": note.geometry.coordinates[0][i],
              }
            };
            markerList.push(<GeoJSON 
              key={uuid.v4()} 
              data={geojson} 
  //            color={(note.id === self.props.selectedNote) ? "#FFFAFA" : note.color }
              color={note.color}
              key={uuid.v4()}
            />);
          }
        }
      }
      
      var legends = [];
      if (self.props.token) {
        legends.push(<Legend 
          position={'bottomright'} 
          key={uuid.v4()}
         />);
      } else {
        legends = null;
      }
      var drag_flag = this.props.dragMode;
  //        <button type="button" id='drag-button'  onClick={(e) => signals.ToggleMap()}>Lock Map</button>
  //        <button type="button" id='draw-polygon' onClick={(e) => signals.DrawMode()}>Draw Polygon</button>
      return (
        <div id='map-panel'>
          <Map 
            onLeafletMousedown={ (e) => this.props.mouseDownOnMap({pt: e.latlng, select_note: this.props.selectedNote, noteSelected:this.props.id}) } 
            onLeafletMouseMove={ (e) => this.props.mouseMoveOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
            onLeafletMouseUp={ (e) => this.props.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
  //          onLeafletdblclick={ (e) => 
  //            signals.mapDoubleClicked({pt: e.latlng, drawMode: false})
  //          }
  //          dragging={this.props.dragMode} 
            dragging={true}
            center={position} 
            ref='map'
            zoom={17}>
  
            <div 
              className={styles[(this.props.drawMode) ? 
                'drawing-popup' : 'hidden']}>
              Tap the map to mark an area
            </div>
  
            <TileLayer
              url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
    
            <RasterLayer 
              url="http://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/"
              async={true}
              geohashGridlines={false}
              tileGridlines={false}
            />
  
            <button 
              type="button" 
              id='start-stop-live-data-button'  
              onClick={(e) => this.props.startStopLiveDataButtonClicked({})}
              >{this.props.liveData ? 'Stop' : 'Start' }
            </button>
            {markerList}
            {polygonList}
            {legends}
  
          </Map> 
        </div>
      );
    }
  }
)
