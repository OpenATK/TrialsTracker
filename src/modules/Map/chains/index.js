import { set } from 'cerebral/operators';
import _ from 'lodash';
import gjArea from '@mapbox/geojson-area';
import computeBoundingBox from '../utils/computeBoundingBox.js';
import getFieldDataForNotes from '../actions/getFieldDataForNotes.js';
import yieldDataStatsForPolygon from '../actions/yieldDataStatsForPolygon.js';
import { state } from 'cerebral/tags'

export let startMovingMap = [
  set(state`app.view.map.moving`, true)
];

export var toggleCropLayerVisibility = [
  toggleCropLayer,
]

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
      getFieldDataForNotes,
      //set(state`map.geohashPolygons`, props`geohashPolygons`),
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

function setMapToCurrentLocation({props, state}) {
  let loc = state.get('app.model.current_location');
  if (loc) state.set('app.view.map.map_location', [loc.lat, loc.lng]);
}

function setMapLocation({props, state}) {
  state.set('app.view.map.map_location', [props.latlng.lat, props.latlng.lng]);
  state.set('app.view.map.map_zoom', props.zoom);
}

function setCurrentLocation({props, state}) {
  let obj = {
    lat: props.lat,
    lng: props.lng,
  }
  state.set('app.model.current_location', obj);
}

function setEmptyPolygon({props, state}) {
  state.unset(['app', 'model', 'notes', props.id, 'stats', 'computing']);
}

function setWaiting({props, state}) {
  state.set(['app', 'model', 'notes', props.id, 'stats', 'computing'], true);
}

function setMarkerPosition({props, state}) {
  let id = state.get('app.view.selected_note');
  state.set(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0, props.idx], [props.lng, props.lat])
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

function undo({props, state}) {
  let id = state.get(['app', 'view', 'selected_note']);
  let points = state.get(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  if (points.length > 0) {
    state.pop(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(['app', 'model', 'fields', props.id]);
  if (field) state.set(['app', 'view', 'map', 'map_location'], field.boundary.centroid);
}

function computeNoteStats({props, state, path}) {
  let token = state.get('app.settings.data_sources.yield.oada_token');
  let domain = state.get('app.settings.data_sources.yield.oada_domain');
  let availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  let baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  let geometry = state.get(['app', 'model', 'notes', props.id, 'geometry']);
  yieldDataStatsForPolygon(geometry.geojson.coordinates[0], geometry.bbox, availableGeohashes, baseUrl, token)
  .then((stats) => {
    return path.success({stats, ids:[props.id]});
  })
}
computeNoteStats.async = true;

function setNoteStats({props, state}) {
  Object.keys(props.stats).forEach(function(crop) {
    if (isNaN(props.stats[crop].mean_yield)) {
      state.unset(['app', 'model', 'notes', props.id, 'stats', crop]);
    } else {
      state.set(['app', 'model', 'notes', props.id, 'stats', crop], props.stats[crop]);
    }
  })
  state.unset(['app', 'model', 'notes', props.id, 'stats', 'computing']);
}

function toggleCropLayer({input, state}) {
  var vis = state.get(['app', 'view', 'map', 'crop_layers', input.crop, 'visible']);
  state.set(['app', 'view', 'map', 'crop_layers', input.crop, 'visible'], !vis);
}

function getNoteBoundingBox({props, state}) {
  let selectedNote = state.get('app.view.selected_note');
  let notes = state.get(['app', 'model', 'notes']);
  let bbox = computeBoundingBox(notes[selectedNote].geometry.geojson);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'bbox'], bbox);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'centroid'], [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2]);
}

function dropPoint ({props, state}) {
  let id = state.get(['app', 'view', 'selected_note']);
  state.push(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], props.pt);
}

function validateNoteText({props, state}) {
}
