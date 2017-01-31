import React from 'react';
import { connect } from 'cerebral-view-react';
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import { 
  Popup, 
  FeatureGroup, 
  Tooltip, 
  DivIcon, 
  Circle, 
  CircleMarker, 
  Polygon, 
  Marker, 
  Map, 
  TileLayer, 
  ImageOverlay, 
  latLng, 
  latLngBounds, 
  LayersControl, 
  GeoJSON ,
  AttributionControl,
} from 'react-leaflet';
const { BaseLayer, Overlay } = LayersControl;
import styles from './map.css';
import uuid from 'uuid';
import RasterLayer from '../RasterLayer';
import FontAwesome from 'react-fontawesome';
import MenuBar from '../MenuBar';
import GpsControl from './GpsControl';
import UndoControl from './UndoControl';
import LegendControl from './LegendControl';
import DrawingMessage from './DrawingMessage';
import { divIcon } from 'leaflet';
import Control from 'react-leaflet-control';

export default connect(props => ({
  cropLayers: 'app.view.map.crop_layers',
  notes: 'app.model.notes',
  selectedNote: 'app.view.selected_note',
  editing: 'app.view.editing',
  legends: 'app.view.legends',
  yieldDataIndex: 'app.model.yield_data_index',
  drawing: 'app.view.map.drawing_note_polygon',
  fields: 'app.model.fields',
  currentLocation: 'app.model.current_location',
  mapLocation: 'app.view.map.map_location',
  mapZoom: 'app.view.map.map_zoom',
  token: 'app.settings.data_sources.yield.oada_token',
  domain: 'app.settings.data_sources.yield.oada_domain',
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
  gpsButtonClicked: 'app.currentLocationButtonClicked',
  toggleCropLayer: 'app.toggleCropLayer',
},

class TrialsMap extends React.Component {

  validateMouseEvent(evt) {
    if (this.props.drawing) {
      if (!this.props.moving && !this.props.dragging) {
        if (!evt.originalEvent.toElement.offsetParent) {
          this.props.mouseDownOnMap({pt: [evt.latlng.lng, evt.latlng.lat]})
        } else if (!evt.originalEvent.toElement.offsetParent.className.includes('control')) {
          this.props.mouseDownOnMap({pt: [evt.latlng.lng, evt.latlng.lat]})
        }
      }
    }
  }

  componentDidMount() {
    this.refs.map.leafletElement.locate();
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
        var marker = divIcon({
          className:styles['selected-note-marker'],
          html: `<span style='color:${note.color}' class='fa fa-map-marker'></span>`
        })
        var markerList = [];
        note.geometry.geojson.coordinates[0].forEach((pt, i)=> {
           markerList.push(<Marker
            className={styles['selected-note-marker']}
//            icon={marker}
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
      rasterLayers.push(
        <Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop} key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            map={this.refs.map.leafletElement}
            data={'app.model.yield_data_index.'+crop}
            icon={marker}
            layer={crop}
            url={'https://'+self.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            token={self.props.token}
            geohashGridlines={false}
            tileGridlines={false}
          />
        </Overlay>
      )
    })
    var undoEnabled = this.props.selectedNote ? 
      this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0 : false;
   
    return (
      <div className={styles['map-panel']}>
        <MenuBar/>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onMouseup={(e) => {this.validateMouseEvent(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
          onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
          dragging={true}
          center={this.props.mapLocation.length > 0 ? this.props.mapLocation : position} 
          ref='map'
          zoom={this.props.mapZoom ? this.props.mapZoom : 15}>
          {this.props.currentLocation ? <CircleMarker
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

          <GpsControl
            position={'topleft'}
          />
          <UndoControl
            position={'topleft'}
            enabled={undoEnabled}
          />
          <DrawingMessage
            position={'bottomright'}
          />
          <LegendControl
            position={'bottomright'} 
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          {notePolygons}
          {markerList}
          <LayersControl 
            position='topright'>
            <Overlay 
              checked 
              name='Fields'>
              <FeatureGroup>
                {fields}
              </FeatureGroup>
            </Overlay>
            {rasterLayers}
          </LayersControl>
        </Map> 
      </div>
    )
  }
})
