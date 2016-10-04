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
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';

export default connect(props => ({
  notes: 'app.model.notes',
  selectedNote: 'app.model.selected_note',
  editing: 'app.view.editing',
  token: 'app.token',
  legends: 'app.view.legends',
  domain: 'app.model.domain',
  yieldDataIndex: 'app.model.yield_data_index',
  drawMode: 'app.view.draw_mode',
}), {
  toggleMap: 'app.ToggleMap',
  mouseDownOnMap: 'app.mouseDownOnMap',
  mouseMoveOnMap: 'app.mouseMoveOnMap',
  mouseUpOnMap: 'app.mouseUpOnMap',
  startStopLiveDataButtonClicked: 'app.startStopLiveDataButtonClicked',
},

  class TrialsMap extends React.Component {

    render() {
      var self = this;
      //var position = [40.98032883, -86.20182673]; // 40.97577156, -86.19773737    40.847044, -86.170438
      var position = [40.853989, -86.142021]; 
      var polygonList = [];
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
      if (this.props.token) {
        legends.push(<Legend 
          position={'bottomright'} 
          key={uuid.v4()}
         />);
      } else {
        legends = null;
      }

      var rasterLayers = [];
      Object.keys(this.props.yieldDataIndex).forEach((crop) => {
        rasterLayers.push(
          <RasterLayer
            key={'RasterLayer-'+crop}
            crop={crop}
            async={true}
            geohashGridlines={false}
            tileGridlines={false}
          />
        )
      })
      console.log(this.props.drawMode);
  //        <button type="button" id='drag-button'  onClick={(e) => signals.ToggleMap()}>Lock Map</button>
  //        <button type="button" id='draw-polygon' onClick={(e) => signals.DrawMode()}>Draw Polygon</button>
      return (
        <div id='map-panel'>
          <Map 
            onLeafletMousedown={ (e) => this.props.mouseDownOnMap({pt: e.latlng, select_note: this.props.selectedNote, noteSelected:this.props.id}) } 
            onLeafletMouseUp={ (e) => this.props.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
  //          onLeafletdblclick={ (e) => 
  //            signals.mapDoubleClicked({pt: e.latlng, drawMode: false})
  //          }
  //          dragging={this.props.dragMode} 
            dragging={true}
            center={position} 
            ref='map'
            zoom={15}>
            <div 
              className={styles[(this.props.drawMode) ? 
                'drawing-popup' : 'hidden']}>
              Tap the map to draw a polygon
            </div>
            <TileLayer
              url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            {rasterLayers}
            <FontAwesome
              className={styles[this.props.editing ?
                'undo-button' : 'hidden']}
              name='undo'
              size='2x'
              onClick={() => this.props.undoDrawPoint({})}
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
