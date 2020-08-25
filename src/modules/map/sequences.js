import { when, set, toggle } from 'cerebral/operators';
import L from 'leaflet';
import computeBoundingBox from './utils/computeBoundingBox.js';
import { state, props } from 'cerebral/tags'
import gjArea from '@mapbox/geojson-area';
import { sequence } from 'cerebral'

export let mapMoveStarted = sequence('mapMoveStarted', [
  set(state`map.moving`, true)
]);

export var toggleLayer = sequence('toggleLayer', [
	when (state`map.layers.${props`name`}`), {
		true: [toggle(state`map.layers.${props`name`}.visible`)],
		false: []
	}
]);

export var fieldNoteClicked = sequence('map.fieldNoteClicked', [
  mapToFieldPolygon,
]);



export let markerDragEnded = sequence('map.markerDragEnded', [
  set(state`map.dragging_marker`, false),
]);

export let markerDragStarted = sequence('map.markerDragStarted', [
  set(state`map.dragging_marker`, true),
]);

export const locationFound = sequence('map.locationFound', [
  set(state`map.current_location`, props`latlng`),
]);

export let myLocationButtonClicked = sequence('map.myLocationButtonClicked', [
  ({state, props}) => ({
    latlng: state.get('app.model.current_location'),
  }),
  setMapLocation,
])

export let mapMoved = [
  setMapLocation,
  set(state`map.moving`, false)
];

function setMapLocation({props, state}) {
  if (props.latlng) state.set('map.center', [props.latlng.lat, props.latlng.lng]);
  if (props.zoom) state.set('map.zoom', props.zoom);
}

export const fitGeometry = sequence('map.fitGeometry', [
  ({state, props}) => {
    if (props.boundary && props.boundary.geojson && props.boundary.geojson.coordinates && props.boundary.geojson.coordinates.length > 0) {
      state.set('map.bounds', L.geoJson(props.boundary.geojson).getBounds());
    }
  },
])

export function getGeojsonArea({props}) {
  if (props.boundary && props.boundary.geojson) {
    if (props.boundary.geojson.coordinates[0].length > 2) {
      let area = gjArea.geometry(props.boundary.geojson)/4046.86;
      let boundary = props.boundary;
      boundary.area = area;
      return {boundary}
    }
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(`fields.${props.id}`);
  if (field) state.set('map.center', field.boundary.centroid);
}

export function getGeojsonBoundingBox({props, state}) {
  let boundary = props.boundary;
  if (props.boundary && props.boundary.geojson) {
    let bbox = computeBoundingBox(props.boundary.geojson);
    let centroid = [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2];
    boundary.bbox = bbox;
    boundary.centroid = centroid;
  }
  return {boundary}
}

export const updateGeometry = sequence('map.updateGeometry', [
  set(props`boundary`, state`notes.${props`noteType`}.${props`id`}.boundary`),
  getGeojsonArea,
  getGeojsonBoundingBox,
])
