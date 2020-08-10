import React from 'react';
import { CircleMarker, GeoJSON, Map as LeafletMap, TileLayer } from 'react-leaflet'
import './index.css'

import overmind from '../../overmind'
import LayerControl from "./LayerControl"
import LegendControl from "./LegendControl"
import Fields from './Fields'

export default function Map() {
  const { actions, state } = overmind();
  const myActions = actions.view.Map;
  const myState = state.view.Map;

  return (
      <LeafletMap 
        bounds={myState.bounds} 
        center={myState.center}
        onClick={(evt) => myActions.onMapClick({...evt.latlng})} 
        onLocationfound={(e) => this.props.locationFound({lat:e.latlng.lat, lng:e.latlng.lng})}
        onMoveStart={(e) => {this.props.mapMoveStarted()}}
        onMoveend={(e) => {this.props.mapMoved({latlng:this.refs.map.leafletElement.getCenter(), zoom: this.refs.map.leafletElement.getZoom()})}}
        zoomControl={false}>
        zoom={myState.zoom || 15}
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
        {this.props.legendVisible ? <LegendControl
          position={'bottomright'} 
        /> : null}
        {myState.notePolygons.map(np => 
          <GeoJSON                                                      
            className={'note-polygon'}                                           
            data={np.geometry.geojson}                         
            color={np.color}                                   
            style={{fillOpacity:0.4}}                                            
            onClick={() => myActions.noteClicked({id:np.id})}                         
            dragging={true}
            key={'note-'+np.id+'-polygon'}
          />
        )}

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
