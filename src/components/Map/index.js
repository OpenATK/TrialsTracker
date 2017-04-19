import React from 'react';
import { connect } from 'cerebral/react';
import { FeatureGroup, CircleMarker, Marker, Map, TileLayer, LayersControl, GeoJSON } from 'react-leaflet';
const { Overlay } = LayersControl;
import './map.css';
import uuid from 'uuid';
import RasterLayer from '../RasterLayer';
import MenuBar from '../MenuBar';
import GpsControl from './GpsControl';
import UndoControl from './UndoControl';
import LegendControl from './LegendControl';
import DrawingMessage from './DrawingMessage';
import {state, signal} from 'cerebral/tags'

export default connect({
  cropLayers: state`app.view.map.crop_layers`,
  notes: state`app.model.notes`,
  selectedNote: state`app.view.selected_note`,
  editing: state`app.view.editing`,
  legends: state`app.view.legends`,
  legendVisible: state`app.view.legend.visible`,
  yieldDataIndex: state`app.model.yield_data_index`,
  fields: state`app.model.fields`,
  currentLocation: state`app.model.current_location`,
  mapLocation: state`app.view.map.map_location`,
  mapZoom: state`app.view.map.map_zoom`,
  token: state`app.settings.data_sources.yield.oada_token`,
  domain: state`app.settings.data_sources.yield.oada_domain`,
  moving: state`app.view.map.moving`,
  dragging: state`app.view.map.dragging_marker`,
  isLoading: state`app.view.map.isLoading`,
  isMobile: state`app.is_mobile`,

  mapMoveStarted: signal`map.mapMoveStarted`,
  mouseDownOnMap: signal`map.mouseDownOnMap`,
  markerDragStarted: signal`map.markerDragStarted`,
  markerDragEnded: signal`map.markerDragEnded`,
  markerDragged: signal`map.markerDragged`,
  locationFound: signal`map.locationFound`,
  mapMoved: signal`map.mapMoved`,
  gpsButtonClicked: signal`map.currentLocationButtonClicked`,
  toggleCropLayer: signal`map.toggleCropLayer`,
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
          style={{fillOpacity:0.4}}
          dragging={true} 
          key={uuid.v4()}
        />)
      }
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

    let fields = [];
    Object.keys(this.props.fields).forEach(function(key) {
      fields.push(<GeoJSON 
        className={'field-polygon'}
        data={self.props.fields[key].boundary.geojson} 
        key={key}
      />)
    })

    let rasterLayers = [];
    Object.keys(this.props.yieldDataIndex).forEach((crop) => {
      rasterLayers.push(
        <Overlay 
          checked={this.props.cropLayers[crop].visible}
          onChange={()=>this.props.toggleCropLayer({crop})}
          name={crop.charAt(0).toUpperCase() + crop.slice(1)}
          key={crop+'-overlay'}>
          <RasterLayer
            key={'RasterLayer-'+crop}
            map={this.refs.map.leafletElement}
            data={'app.model.yield_data_index.'+crop}
            layer={crop}
            url={'https://'+self.props.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
            token={self.props.token}
            geohashGridlines={false}
            tileGridlines={false}
          />
        </Overlay>
      )
    })
    let undoEnabled = this.props.selectedNote ? 
      this.props.notes[this.props.selectedNote].geometry.geojson.coordinates[0].length > 0 : false;

    return (
      <div className={'map-panel'}>
        <MenuBar/>
        <div className={this.props.isLoading ? 'loading-screen' : 'hidden'}/>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onClick={(e) => {this.validateMouseEvent(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
          onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
          dragging={true}
          center={this.props.mapLocation.length > 0 ? this.props.mapLocation : position} 
          ref='map'
          zoomControl={this.props.isMobile}
          attributionControl={this.props.isMobile}
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

          {this.props.isMobile ? null : <GpsControl
            position={'topleft'}
          />}
          {this.props.isMobile ? null : <UndoControl
            position={'topleft'}
            enabled={undoEnabled}
          />}
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
