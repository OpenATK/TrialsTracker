/*
  Adds points/polygons to map when drawing a boundary
*/
import React, { Component } from 'react';
import { Marker, Polygon, LayerGroup } from 'react-leaflet'

import overmind from '../../../overmind'
import _ from 'lodash';

export default function BoundaryDrawing() {
  const {state, actions} = overmind();
  const myState = state.view.Map.BoundaryDrawing;
  const myActions = actions.view.Map.BoundaryDrawing;

  const { boundary, drawing } = myState;
  const { onMarkerMove } = myActions;

  if (!drawing) return null;
  return (
    <LayerGroup>
      <Polygon positions={_.map(boundary)} />
      {_.map(boundary, (latlng, id) => <Marker position={latlng} key={id} draggable onMove={({latlng, oldLatLng}) => onMarkerMove({latlng, oldLatLng, id})}/>)}
    </LayerGroup>
  );
}
