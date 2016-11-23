import React, { Proptypes } from 'react';
import { connect } from 'cerebral-view-react';
import { CircleMarker, Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds} from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';
var GeoJSON = require('react-leaflet').GeoJson;
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import RasterLayer from '../RasterLayer';
import Legend from '../Legend';
import fastyles from '../css/font-awesome.min.css';
import FontAwesome from 'react-fontawesome';
import MenuBar from '../MenuBar';

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
  token: 'app.view.server.token',
  domain: 'app.view.server.domain',
}), {
  toggleMap: 'app.ToggleMap',
  mouseDownOnMap: 'app.mouseDownOnMap',
  mouseMoveOnMap: 'app.mouseMoveOnMap',
  mouseUpOnMap: 'app.mouseUpOnMap',
  startStopLiveDataButtonClicked: 'app.startStopLiveDataButtonClicked',
  undoButtonClicked: 'app.undoButtonClicked',
  markerDragged: 'app.markerDragged',
  locationFound: 'app.locationFound',
  mapMoved: 'app.mapMoved',
  currentLocationButtonClicked: 'app.currentLocationButtonClicked',
},

class TrialsMap extends React.Component {

  validatePolygon(evt) {
    if (this.props.drawMode) {
      this.props.mouseDownOnMap({pt: evt.latlng})
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
          key={key}
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
            onDragEnd={(e)=>{this.props.markerDragged({lat: e.target._latlng.lat, lng:e.target._latlng.lng, idx: i})}}
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

    return (
      <div className={styles['map-panel']}>
        <MenuBar/>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onLeafletMousedown={(e)=>{this.validatePolygon(e)}} 
          onLeafletMouseUp={(e) => this.props.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote})}
          onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.getLeafletElement().getCenter()})}}
          dragging={true}
          center={this.props.mapLocation[0] ? this.props.mapLocation : position} 
          ref='map'
          zoom={15}>
          <div 
            className={styles[(this.props.drawing) ? 
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
            onClick={() => this.props.undoButtonClicked({})}
          />
          {markerList}
          {notePolygons}
          {fields}
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
          <button
            className={styles['gps-button']}
            onClick={() => this.props.currentLocationButtonClicked({})}
          />
        </Map> 
      </div>
    )
  }
})
