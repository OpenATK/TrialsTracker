import React from 'react';
import md5 from 'md5';
import {v4 as uuid} from 'uuid';
import _ from 'lodash'
import { CircleMarker, GeoJSON, Map as LeafletMap, Marker, TileLayer } from 'react-leaflet'
import './styles.css'

import overmind from '../../overmind'
import LayerControl from "./LayerControl"
import LegendControl from "./LegendControl"
import Fields from './Fields'

export default function Map() {
  const { actions, state } = overmind();
  const myActions = actions.view.Map;
  const myState = state.view.Map;
  const editing = state.notes.editing;
  const selectedNote = state.notes.selectedNote.id;
  const noteType = state.notes.selectedNote.type;

  let validateMouseEvent = function (evt) {
    if (editing) {
      // Don't fire a click event when panning the map or when dragging a point.
      if (!myState.moving && !myState.dragging) {
        // Don't add a point if a control was clicked.
        if (!evt.originalEvent.toElement.offsetParent) {
          myActions.onMapClick({latlng: evt.latlng})
        } else if (!evt.originalEvent.toElement.offsetParent.className.includes('control')) {
          myActions.onMapClick({latlng: evt.latlng})
        }
      }
    }
  }

  let notePolygons = _.filter(
    Object.keys(state.notes.notes), 
    key => state.notes.notes[key].boundary.geojson.coordinates[0].length > 0
  ).map(key =>
    <GeoJSON                                                      
      className={'note-polygon'}                                           
      data={state.notes.notes[key].boundary.geojson}                         
      color={state.notes.notes[key].color}                                   
      style={{fillOpacity:0.4}}                                            
      onClick={() => myActions.noteClicked({key})}                         
      dragging={true}
      key={'note-'+key+'-polygon'+md5(JSON.stringify(state.notes.notes[key].boundary.geojson.coordinates))}
    />
  );

  let drawMarkers = editing ?
    state.notes.notes[selectedNote].boundary.geojson.coordinates[0].map((pt, i) =>
      <Marker
        className={'drawing-note-markers'}
        key={selectedNote+'-'+i} 
        position={[pt[1], pt[0]]}
        color={state.notes.notes[selectedNote].color}
        draggable={true}
        onDrag={(e)=>{myActions.markerDragged({latlng: e.target._latlng, i})}}
        onDragStart={(e)=>{myActions.markerDragStarted({i})}}
        onDragEnd={(e)=>{myActions.markerDragEnded({latlng:e.target._latlng, i})}}
      />)
  : null

  return (
      <LeafletMap 
        bounds={myState.bounds} 
        center={myState.center}
        onClick={(evt) => validateMouseEvent(evt)} 
        onLocationfound={(e) => myActions.locationFound({latlng:e.latlng})}
        onMoveStart={(e) => {myActions.mapMoveStarted()}}
        onMoveend={(e) => {myActions.mapMoved({center:e.target.options.center, zoom: e.target._zoom})}}
        zoomControl={false}>
        zoom={myState.zoom || 15}
        ref='map'
        {myState.currentLocation ? <CircleMarker
          key={'currentLocationMarker'}
          center={myState.currentLocation}
          radius={8}
          opacity={1.0}
          color={"white"}
          weight={2}
          fillColor={"#0080ff"}
          fillOpacity={0.8}
          >
        </CircleMarker> : null}
        {myState.legendVisible ? <LegendControl
          position={'bottomright'} 
        /> : null}
        {notePolygons}
        {drawMarkers}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <LayerControl />
        <TileLayer
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
          minZoom={0}
          maxZoom={20}
          attribution=""
        />
        <Fields />
      </LeafletMap>
  );
}
