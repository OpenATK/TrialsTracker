import React from 'react';
import { connect } from '@cerebral/react';
import { CircleMarker, Marker, Map, TileLayer, GeoJSON } from 'react-leaflet';
import './map.css';
import uuid from 'uuid';
import DrawingMessage from './DrawingMessage';
import {state, signal} from 'cerebral/tags'
import LayerControl from './LayerControl'
import LegendControl from './LegendControl'

export default connect({
  notes: state`App.model.notes`,
  selectedNote: state`App.view.selected_note`,
  editing: state`App.view.editing`,
  legends: state`App.view.legends`,
  legendVisible: state`App.view.legend.visible`,
  currentLocation: state`App.model.current_location`,
  mapZoom: state`App.view.map.map_zoom`,
  moving: state`App.view.map.moving`,
  dragging: state`App.view.map.dragging_marker`,
  isLoading: state`App.view.map.isLoading`,
  isMobile: state`App.is_mobile`,
  geohashPolygons: state`App.view.map.geohashPolygons`,

  mapMoveStarted: signal`map.mapMoveStarted`,
  mouseDownOnMap: signal`map.mouseDownOnMap`,
  markerDragStarted: signal`map.markerDragStarted`,
  markerDragEnded: signal`map.markerDragEnded`,
  markerDragged: signal`map.markerDragged`,
  locationFound: signal`map.locationFound`,
  mapMoved: signal`map.mapMoved`,
  gpsButtonClicked: signal`map.currentLocationButtonClicked`,
},

class TrialsMap extends React.Component {

  validateMouseEvent(evt) {
    if (this.props.editing) {
      // Don't fire a click event when panning the map or when dragging a point.
      if (!this.props.moving && !this.props.dragging) {
        // Don't add a point if a control was clicked.
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
    let self = this;
    let position = [40.98551896940516, -86.18823766708374];

    let notePolygons = [];
    Object.keys(this.props.notes).forEach(function(key) {
      if (self.props.notes[key].geometry.geojson.coordinates[0].length > 0) {
        notePolygons.push(<GeoJSON 
          className={'note-polygon'}
          data={self.props.notes[key].geometry.geojson} 
          color={self.props.notes[key].color} 
          style={{fillOpacity:0.0}}
          dragging={true} 
          key={uuid.v4()} //TODO don't create a new one every time
        />)
      }
    })

    let geohashPolygons = [];
    this.props.geohashPolygons.forEach(function(gjson) {
      geohashPolygons.push(<GeoJSON
        className={'geohash-polygon'}
        data={gjson} 
        style={{fillOpacity:0.0, strokeWidth: 1}}
        key={uuid.v4()}
      />)
    })

    let markerList = [];
    if (this.props.editing) {
      let note = this.props.notes[this.props.selectedNote];
      if (note.geometry.geojson.coordinates[0].length > 0) {
        markerList = [];
        note.geometry.geojson.coordinates[0].forEach((pt, i)=> {
           markerList.push(<Marker
            className={'selected-note-marker'}
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

    return (
      <div className={'map-panel'}>
        <div className={this.props.isLoading ? 'loading-screen' : 'hidden'}/>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onClick={(e) => {this.validateMouseEvent(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
          onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
          dragging={true}
          ref='map'
          center={position}
          attributionControl={!this.props.isMobile}
          zoom={this.props.mapZoom || 15}>
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
          <DrawingMessage
            position={'topright'}
          />
          {this.props.legendVisible ? <LegendControl
            position={'bottomright'} 
          /> : null}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
          {notePolygons}
          {geohashPolygons}
          {markerList}
          <LayerControl />
        </Map> 
      </div>
    )
  }
})
