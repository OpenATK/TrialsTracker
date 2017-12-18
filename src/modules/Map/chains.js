import { set } from 'cerebral/operators';
import _ from 'lodash';
import computeBoundingBox from './utils/computeBoundingBox.js';
import { state } from 'cerebral/tags'
import gjArea from '@mapbox/geojson-area';

export let startMovingMap = [
  set(state`Map.moving`, true)
];

export var toggleCropLayerVisibility = [
  toggleCropLayer,
]

export let doneMovingMap = [
  set(state`Map.moving`, false)
];

export let handleMapClick = [
  dropPoint, 
  recalculateArea, 
  getNoteBoundingBox, 
];

export let handleLocationFound = [
  setCurrentLocation,
];

export var handleFieldNoteClick = [
  mapToFieldPolygon,
];

export let undoDrawPoint = [
  undo, 
  recalculateArea,
  getNoteBoundingBox
];

export let endMarkerDrag = [
  set(state`Map.dragging_marker`, false),
];

export let startMarkerDrag = [
  set(state`Map.dragging_marker`, true),
];

export let markerDragging = [
  setMarkerPosition, 
  recalculateArea
];

export let handleCurrentLocationButton = [
  setMapToCurrentLocation,
]

export let handleMapMoved = [
  setMapLocation,
];

function setMapToCurrentLocation({state}) {
  let loc = state.get('App.model.current_location');
  if (loc) state.set('Map.center', [loc.lat, loc.lng]);
}

function setMapLocation({props, state}) {
  state.set('Map.center', [props.latlng.lat, props.latlng.lng]);
  state.set('Map.zoom', props.zoom);
}

function setCurrentLocation({props, state}) {
  let obj = {
    lat: props.lat,
    lng: props.lng,
  }
  state.set('App.model.current_location', obj);
}

function setMarkerPosition({props, state}) {
  let id = state.get('Note.selected_note');
  state.set(`Note.notes.${id}.geometry.geojson.coordinates.0.${props.idx}`, [props.lng, props.lat])
}

function recalculateArea({state}) {
  let id = state.get('Note.selected_note');
  let note = state.get(`Note.notes.${id}`);
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      let area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(`Note.notes.${id}.geometry.area`, area);
    }
  }
}

function undo({props, state}) {
  let id = state.get('Note.selected_note');
	let points = state.get(`Note.notes.${id}.geometry.geojson.coordinates.0`);
  if (points.length > 0) {
    state.pop(`Note.notes.${id}.geometry.geojson.coordinates.0`);
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(`Fields.${props.id}`);
  if (field) state.set('Map.center', field.boundary.centroid);
}

function toggleCropLayer({props, state}) {
  var vis = state.get(`Map.crop_layers.${props.crop}.visible`);
  state.set(`Map.crop_layers${props.crop}.visible`, !vis);
}

function getNoteBoundingBox({props, state}) {
  let selectedNote = state.get('Note.selected_note');
  let notes = state.get('Note.notes');
  let bbox = computeBoundingBox(notes[selectedNote].geometry.geojson);
  state.set(`Note.notes.${selectedNote}.geometry.bbox`, bbox);
  state.set(`Note.notes.${selectedNote}.geometry.centroid`, [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2]);
}

function dropPoint ({props, state}) {
  let id = state.get('Note.selected_note');
  state.push(`Note.notes.${id}.geometry.geojson.coordinates.0`, props.pt);
}
