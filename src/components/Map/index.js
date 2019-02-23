import React from 'react';
import {renderToStaticMarkup } from 'react-dom/server';
import { connect } from '@cerebral/react';
import { divIcon } from 'leaflet'
import { Marker, CircleMarker, Map, TileLayer} from 'react-leaflet';
import './map.css';
//import DrawingMessage from './DrawingMessage';
import {state, signal} from 'cerebral/tags'
import LayerControl from './LayerControl'
import LegendControl from './LegendControl'
import LoadingScreen from '../LoadingScreen'

export default connect({
	selectedNote: state`notes.${state`notes.selected_note.type`}.${state`notes.selected_note.id`}`,
	selected: state`notes.selected_note`,
  editing: state`view.editing`,
  legends: state`view.legends`,
  legendVisible: state`view.legend.visible`,
  currentLocation: state`map.current_location`,
  mapZoom: state`map.zoom`,
  moving: state`map.moving`,
  bounds: state`map.bounds`,
  dragging: state`map.dragging_marker`,
  notesLoading: state`notes.loading`,
  fieldsLoading: state`fields.loading`,
  isMobile: state`view.is_mobile`,
	center: state`map.center`,

  mapMoveStarted: signal`map.mapMoveStarted`,
  mouseDownOnMap: signal`notes.mouseDownOnMap`,
  markerDragStarted: signal`map.markerDragStarted`,
  markerDragEnded: signal`map.markerDragEnded`,
  markerDragged: signal`notes.markerDragged`,
  locationFound: signal`map.locationFound`,
  mapMoved: signal`map.mapMoved`,
	gpsButtonClicked: signal`map.currentLocationButtonClicked`,
	noteClicked: signal`notes.noteClicked`,
	toggleLayer: signal`map.toggleLayer`,
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

    // Render markers for edited polygon
		let markerList = [];
		if (this.props.selectedNote && this.props.selectedNote.boundary && this.props.selectedNote.boundary.geojson && this.props.editing) {
      markerList = this.props.selectedNote.boundary.geojson.coordinates[0].map((pt, i) => {
        return <Marker
					key={this.props.selectedNote+'-'+i}
					position={[pt[1], pt[0]]}
					draggable={true}
					onDrag={(e)=>{this.props.markerDragged({id: this.props.selected.id, noteType: this.props.selected.type, lat: e.target._latlng.lat, lng:e.target._latlng.lng, idx: i})}}
					onDragStart={(e)=>{this.props.markerDragStarted({})}}
					onDragEnd={(e)=>{this.props.markerDragEnded({})}}
        />
      })
		}

		return (
      <div className={'map-panel'}>
        <Map 
          onLocationfound={(e) => this.props.locationFound({latlng: e.latlng})}
          onClick={(e) => {this.validateMouseEvent(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
					onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
          dragging={true}
          bounds={this.props.bounds}
          ref='map'
          center={this.props.center}
					attributionControl={this.props.isMobile ? !this.props.isMobile : false}
					zoomControl={true/*!this.props.isMobile*/}
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
					{/*<DrawingMessage
            position={'topright'}
					/>*/}
          {this.props.legendVisible ? <LegendControl
            position={'bottomright'} 
          /> : null}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
					/>
					{markerList}
          <LayerControl />
        </Map> 
				{this.props.notesLoading || this.props.fieldsLoading ? <LoadingScreen /> : null}
      </div>
    )
  }
})
