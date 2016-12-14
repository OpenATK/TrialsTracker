import React, { Proptypes } from 'react';
import { connect } from 'cerebral-view-react';
import { Popup, FeatureGroup, Circle, CircleMarker, Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds, LayersControl, GeoJSON } from 'react-leaflet';
const { BaseLayer, Overlay } = LayersControl;
import styles from './map.css';
import uuid from 'uuid';
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import RasterLayer from '../RasterLayer';
import Legend from '../Legend';
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';
import MenuBar from '../MenuBar';
import GpsControl from './GpsControl';
import UndoControl from './UndoControl';

export default connect(props => ({
  cropLayers: 'app.view.map.crop_layers',
  notes: 'app.model.notes',
  selectedNote: 'app.view.selected_note',
  editing: 'app.view.editing',
  legends: 'app.view.legends',
  yieldDataIndex: 'app.model.yield_data_index',
  drawing: 'app.view.map.drawing_note_polygon',
  fields: 'app.model.fields',
  currentLocation: 'app.view.map.current_location',
  mapLocation: 'app.view.map.map_location',
  mapZoom: 'app.view.map.map_zoom',
  token: 'app.view.server.token',
  domain: 'app.view.server.domain',
  moving: 'app.view.map.moving',
  dragging: 'app.view.map.dragging_marker',
}), {
  mapMoveStarted: 'app.mapMoveStarted',
  mouseDownOnMap: 'app.mouseDownOnMap',
  mouseMoveOnMap: 'app.mouseMoveOnMap',
  startStopLiveDataButtonClicked: 'app.startStopLiveDataButtonClicked',
  markerDragStarted: 'app.markerDragStarted',
  markerDragEnded: 'app.markerDragEnded',
  markerDragged: 'app.markerDragged',
  locationFound: 'app.locationFound',
  mapMoved: 'app.mapMoved',
},

class TrialsMap extends React.Component {

  move(evt) {
  }

  validatePolygon(evt) {
    console.log(!this.props.dragging && !this.props.moving && this.props.drawing);
    if (!this.props.dragging && !this.props.moving && this.props.drawing) {
      this.props.mouseDownOnMap({pt: [evt.latlng.lng, evt.latlng.lat]})
    }
  }

  render() {
    var self = this;
    var position = [40.98551896940516, -86.18823766708374];

    var notePolygons = [];
    Object.keys(this.props.notes).forEach(function(key) {
      if (self.props.notes[key].geometry.geojson.coordinates[0].length > 0) {
        notePolygons.push(<GeoJSON 
          className={styles['note-polygon']}
          data={self.props.notes[key].geometry.geojson} 
          color={self.props.notes[key].color} 
          dragging={true} 
          key={uuid.v4()}
        />)
      }
    })

    var markerList = [];
    if (this.props.drawing) {
      var note = this.props.notes[this.props.selectedNote];
      if (note.geometry.geojson.coordinates[0].length > 0) {
        var markerList = [];
        note.geometry.geojson.coordinates[0].forEach((pt, i)=> {
           markerList.push(<Marker
            className={styles['selected-note-marker']}
            key={this.props.selectedNote+'-'+i} 
            position={[pt[1], pt[0]]}
            color={note.color}
            draggable={true}
            onDrag={(e)=>{this.props.markerDragged({lat: e.target._latlng.lat, lng:e.target._latlng.lng, idx: i})}}
            onDragStart={(e)=>{this.props.markerDragStarted({idx: i})}}
            onDragEnd={(e)=>{this.props.markerDragEnded({lat: e.target._latlng.lat, lng:e.target._latlng.lng, idx: i})}}
          />)
        })
      }
    }

    var fields = [];
    Object.keys(this.props.fields).forEach(function(key) {
      fields.push(<GeoJSON 
        className={styles['field-polygon']}
        data={self.props.fields[key].boundary.geojson} 
        key={key}
      />)
    })

    var rasterLayers = [];
    Object.keys(this.props.yieldDataIndex).forEach((crop) => {
      if (this.props.cropLayers[crop].visible) {
        rasterLayers.push(
          <RasterLayer
            key={'RasterLayer-'+crop}
            data={'app.model.yield_data_index.'+crop}
            layer={crop}
            url={'https://'+self.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            token={self.props.token}
            async={true}
            geohashGridlines={false}
            tileGridlines={false}
          />
        )
      }
    })
//    onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.getLeafletElement().getCenter(), zoom: this.refs.map.getLeafletElement().getZoom()})}
   
    return (
      <div className={styles['map-panel']}>
        <div 
          className={styles[(this.props.drawing) ? 
            'drawing-popup' : 'hidden']}>
          Tap the map to draw a polygon
        </div>
        <Legend 
          position={'bottomright'} 
          key={'legend'}
        />
        {this.props.currentLocation.lat ? <CircleMarker
          key={'currentLocationMarker'}
          center={this.props.currentLocation}
          radius={8}
          opacity={1.0}
          color={"white"}
          weight={2}
          fillColor={"#0080ff"}
          fillOpacity={0.8}
          >
        </CircleMarker> : null}
        <MenuBar/>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onMouseup={(e) => {this.validatePolygon(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
          dragging={true}
          center={this.props.mapLocation.length > 0 ? this.props.mapLocation : position} 
          ref='map'
          zoom={this.props.mapZoom ? this.props.mapZoom : 15}>
          <TileLayer
            url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          <UndoControl 
            visible={this.props.drawing}
            disabled={this.props.selectedNote ?
              (this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0) : false}
          />
          <GpsControl 
            disabled={(this.props.currentLocation.lat) ? true : false}
          />
          {fields}
          {notePolygons}
          {markerList}
          {rasterLayers}
        </Map> 
      </div>
    )
  }
})
