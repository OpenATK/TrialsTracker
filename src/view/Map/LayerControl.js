import React from 'react';
import L from 'leaflet'
import overmind from "../../overmind"
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
//import './map.css';
import './styles.css';
import RasterLayer from '../RasterLayer';
import {v1 as uuid} from "uuid";
const { Overlay } = LayersControl;

export default function LayerControl(props) {
  const {actions, state} = overmind();
  const myActions = actions.view.LayerControl;
  const myState = state.view.Control;
  const yieldState = state.yield;

  return (
    <LayersControl 
      position='topright'>
      {yieldState.geohashPolygons.length ? <Overlay 
        name='Geohash Polygons'>
        <FeatureGroup>
          {yieldState.geohashPolygons.map(polygon => <GeoJSON 
            className={'geohash-polygon'}
            data={polygon} 
            style={{fillOpacity:0.0, strokeWidth: 1}}                                  
            key={uuid.v4()}
          />)}
       </FeatureGroup>
      </Overlay> : null }
      <Overlay 
        checked 
        name='Fields'>
        <FeatureGroup>
          {Object.values(state.notes.fields || {}).map(field => <GeoJSON 
            className={'field-polygon'}
            data={field.boundary.geojson} 
            key={field.id}
          />)}
       </FeatureGroup>
      </Overlay>
      {Object.keys(yieldState.index || {}).map(crop =>
        <Overlay 
        checked={yieldState.cropLayers[crop].visible}
        onChange={() => myActions.toggleCropLayer({crop})}
        name={crop.charAt(0).toUpperCase() + crop.slice(1)}
        key={crop+'-overlay'}>
        <RasterLayer
          key={'RasterLayer-'+crop}
          layer={crop}
        />
      </Overlay>
    )}
    </LayersControl>
  )
}
