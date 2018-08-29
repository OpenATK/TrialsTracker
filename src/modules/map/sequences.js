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
  set(state`app.model.current_location`, props`latlng`),
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
    if (props.geometry && props.geometry.geojson && props.geometry.geojson.coordinates && props.geometry.geojson.coordinates.length > 0) {
      state.set('map.bounds', L.geoJson(props.geometry.geojson).getBounds());
    }
  },
])

export function getGeojsonArea({props}) {
  if (props.geometry && props.geometry.geojson) {
    if (props.geometry.geojson.coordinates[0].length > 2) {
      let area = gjArea.geometry(props.geometry.geojson)/4046.86;
      let geometry = props.geometry;
      geometry.area = area;
      return {geometry}
    }
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(`fields.${props.id}`);
  if (field) state.set('map.center', field.boundary.centroid);
}

export function getGeojsonBoundingBox({props, state}) {
  let geometry = props.geometry;
  if (props.geometry && props.geometry.geojson) {
    let bbox = computeBoundingBox(props.geometry.geojson);
    let centroid = [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2];
    geometry.bbox = bbox;
    geometry.centroid = centroid;
  }
  return {geometry}
}

export const updateGeometry = sequence('map.updateGeometry', [
  set(props`geometry`, state`notes.${props`type`}.${props`id`}.geometry`),
  getGeojsonArea,
  getGeojsonBoundingBox,
])
