import React from 'react';
import overmind from "../../overmind"
import { FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
//import './map.css';
import './index.css';
import RasterLayer from '../RasterLayer/index.js';
import {v1 as uuid} from "uuid";
const { Overlay } = LayersControl;

export default function LayerControl() {
  const {actions, state} = overmind();
  const myActions = actions.view.LayerControl;
  const myState = state.view.Control;

  let yieldDataIndex = state.Yield.data_index;
  let fields = state.Fields;

  return (
    <LayersControl 
      position='topright'>
      {myState.geohashPolygons.length ? <Overlay 
        name='Geohash Polygons'>
        <FeatureGroup>
          {myState.geohashPolygons.map(polygon => <GeoJSON 
            className={'geohash-polygon'}
            data={polygon} 
            style={{fillOpacity:0.0, strokeWidth: 1}}                                  
            key={uuid.v4()}
          />)}
       </FeatureGroup>
      </Overlay> : null }

      {Object.keys(myState.fields).length ? <Overlay 
        checked 
        name='Fields'>
        <FeatureGroup>
          {Object.keys(fields).map(field => <GeoJSON 
            className={'field-polygon'}
            data={fields[field].boundary.geojson} 
            key={field}
          />)}
       </FeatureGroup>
      </Overlay> : null }
      {Object.keys(yieldDataIndex || {}).map(crop => 
        <Overlay 
        checked={myState.cropLayers[crop].visible}
        onChange={() => myActions.toggleCropLayer({crop})}
        name={crop.charAt(0).toUpperCase() + crop.slice(1)}
        key={crop+'-overlay'}>
        <RasterLayer
          key={'RasterLayer-'+crop}
          data={'Yield.data_index.'+crop}
          layer={crop}
          url={myState.domain+'/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop}
          geohashGridlines={false}
          tileGridlines={false}
        />
      </Overlay>
    )}
    </LayersControl>
  )
}
