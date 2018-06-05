import React from 'react';
import { connect } from '@cerebral/react';
import { CircleMarker, Map, TileLayer} from 'react-leaflet';
import './map.css';
//import DrawingMessage from './DrawingMessage';
import {state, signal} from 'cerebral/tags'
import LayerControl from './LayerControl'
import LegendControl from './LegendControl'
import LoadingScreen from '../LoadingScreen'

export default connect({
  editing: state`app.view.editing`,
  legends: state`app.view.legends`,
  legendVisible: state`app.view.legend.visible`,
  currentLocation: state`app.model.current_location`,
  mapZoom: state`map.zoom`,
  moving: state`map.moving`,
  dragging: state`map.dragging_marker`,
  notesLoading: state`notes.loading`,
  fieldsLoading: state`fields.loading`,
  isMobile: state`app.is_mobile`,
	center: state`map.center`,

  mapMoveStarted: signal`map.mapMoveStarted`,
  mouseDownOnMap: signal`map.mouseDownOnMap`,
  markerDragStarted: signal`map.markerDragStarted`,
  markerDragEnded: signal`map.markerDragEnded`,
  markerDragged: signal`map.markerDragged`,
  locationFound: signal`map.locationFound`,
  mapMoved: signal`map.mapMoved`,
	gpsButtonClicked: signal`map.currentLocationButtonClicked`,
  noteClicked: signal`notes.noteClicked`,        
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

    return (
      <div className={'map-panel'}>
        <Map 
          onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
          onClick={(e) => {this.validateMouseEvent(e)}} 
          onMoveStart={(e) => {this.props.mapMoveStarted()}}
          onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
          dragging={true}
          ref='map'
          center={this.props.center}
					attributionControl={!this.props.isMobile}
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
          <LayerControl />
        </Map> 
				{this.props.notesLoading || this.props.fieldsLoading ? <LoadingScreen /> : null}
      </div>
    )
  }
})
