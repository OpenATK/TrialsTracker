import { set } from 'cerebral/operators';
import _ from 'lodash';
import gjArea from '@mapbox/geojson-area';
import computeBoundingBox from '../utils/computeBoundingBox.js';
import getFieldDataForNotes from '../actions/getFieldDataForNotes.js';
import yieldDataStatsForPolygon from '../actions/yieldDataStatsForPolygon.js';
import {state } from 'cerebral/tags'

export let startMovingMap = [
  set(state`app.view.map.moving`, true)
];

export let doneMovingMap = [
  set(state`app.view.map.moving`, false)
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

export let drawComplete = [
  set(state`app.view.editing_note`, false), 
  validateNoteText,
  setWaiting,
  computeNoteStats, {
    success: [
      setNoteStats, 
      getFieldDataForNotes
    ],
    error: [setEmptyPolygon],
  },
];

export let endMarkerDrag = [
  set(state`app.view.map.dragging_marker`, false),
];

export let startMarkerDrag = [
  set(state`app.view.map.dragging_marker`, true),
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

function setMapToCurrentLocation({input, state}) {
  let loc = state.get('app.model.current_location');
  if (loc) state.set('app.view.map.map_location', [loc.lat, loc.lng]);
}

function setMapLocation({input, state}) {
  state.set('app.view.map.map_location', [input.latlng.lat, input.latlng.lng]);
  state.set('app.view.map.map_zoom', input.zoom);
}

function setCurrentLocation({input, state}) {
  let obj = {
    lat: input.lat,
    lng: input.lng,
  }
  state.set('app.model.current_location', obj);
}

function setEmptyPolygon({input, state}) {
  state.unset(['app', 'model', 'notes', input.id, 'stats', 'computing']);
}

function setWaiting({input, state}) {
  state.set(['app', 'model', 'notes', input.id, 'stats', 'computing'], true);
}

function setMarkerPosition({input, state}) {
  let id = state.get('app.view.selected_note');
  state.set(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0, input.idx], [input.lng, input.lat])
}

function recalculateArea({state}) {
  let id = state.get(['app', 'view', 'selected_note']);
  let note = state.get(['app', 'model', 'notes', id]);
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      let area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(['app', 'model', 'notes', id, 'area'], area);
    }
  }
}

function undo({input, state}) {
  let id = state.get(['app', 'view', 'selected_note']);
  let points = state.get(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  if (points.length > 0) {
    state.pop(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  }
}

function mapToFieldPolygon({input, state}) {
  var field = state.get(['app', 'model', 'fields', input.id]);
  if (field) state.set(['app', 'view', 'map', 'map_location'], field.boundary.centroid);
}

function computeNoteStats({input, state, output}) {
  let token = state.get('app.settings.data_sources.yield.oada_token');
  let domain = state.get('app.settings.data_sources.yield.oada_domain');
  let availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  let baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  let geometry = state.get(['app', 'model', 'notes', input.id, 'geometry']);
  yieldDataStatsForPolygon(geometry.geojson.coordinates[0], geometry.bbox, availableGeohashes, baseUrl, token)
  .then((stats) => {
    output.success({stats, ids:[input.id]});
  })
}
computeNoteStats.outputs = ['success', 'error'];
computeNoteStats.async = true;

function setNoteStats({input, state}) {
  Object.keys(input.stats).forEach(function(crop) {
    if (isNaN(input.stats[crop].mean_yield)) {
      state.unset(['app', 'model', 'notes', input.id, 'stats', crop]);
    } else {
      state.set(['app', 'model', 'notes', input.id, 'stats', crop], input.stats[crop]);
    }
  })
  state.unset(['app', 'model', 'notes', input.id, 'stats', 'computing']);
}

function getNoteBoundingBox({input, state, output}) {
  let selectedNote = state.get('app.view.selected_note');
  let notes = state.get(['app', 'model', 'notes']);
  let bbox = computeBoundingBox(notes[selectedNote].geometry.geojson);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'bbox'], bbox);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'centroid'], [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2]);
}

function dropPoint ({input, state}) {
  let id = state.get(['app', 'view', 'selected_note']);
  state.push(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], input.pt);
}

function validateNoteText({input, state}) {
}
