/*
  Adds points/polygons to map when drawing a boundary
*/
import React from 'react';
import { LayerGroup, GeoJSON } from 'react-leaflet'

import overmind from '../../../overmind'

import _ from 'lodash';
import {v1 as uuid} from 'uuid'

export default function Fields() {
  const {state, actions} = overmind();
  const myState = state.view.Map;
  const myActions = actions.view.Map;

  const { fields } = myState;
  const { onFieldClick } = myActions;

  if (_.keys(fields).length === 0) return null;
  return (
    <LayerGroup>
      {_.map(fields, (field, id) =>
        <GeoJSON
          bubblingMouseEvents={false}
          style={field.style}
          data={field.boundary}
          key={uuid()} //Must be uuid to unmount/mount when field style or boundary changes
          onClick={(evt) => {onFieldClick({id})}} />
      )}
    </LayerGroup>
  );
}
