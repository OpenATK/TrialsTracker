import { set } from 'cerebral/operators';
import _ from 'lodash';
import computeBoundingBox from '../utils/computeBoundingBox.js';
import yieldDataStatsForPolygon from '../actions/yieldDataStatsForPolygon.js';
import { state, props} from 'cerebral/tags'
import gjArea from '@mapbox/geojson-area';

export let startMovingMap = [
  set(state`App.view.map.moving`, true)
];

export var toggleCropLayerVisibility = [
  toggleCropLayer,
]

export let doneMovingMap = [
  set(state`App.view.map.moving`, false)
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
  set(state`App.view.editing`, false), 
  validateNoteText,
  setWaiting,
  computeNoteStats, {
    success: [
      setNoteStats, 
      set(state`App.view.map.geohashPolygons`, props`geohashPolygons`),
    ],
    error: [setEmptyPolygon],
  },
];

export let endMarkerDrag = [
  set(state`App.view.map.dragging_marker`, false),
];

export let startMarkerDrag = [
  set(state`App.view.map.dragging_marker`, true),
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
  let loc = state.get('App.model.current_location');
  if (loc) state.set('App.view.map.map_location', [loc.lat, loc.lng]);
}

function setMapLocation({props, state}) {
  state.set('App.view.map.map_location', [props.latlng.lat, props.latlng.lng]);
  state.set('App.view.map.map_zoom', props.zoom);
}

function setCurrentLocation({props, state}) {
  let obj = {
    lat: props.lat,
    lng: props.lng,
  }
  state.set('App.model.current_location', obj);
}

function setEmptyPolygon({props, state}) {
  state.unset(['App', 'model', 'notes', props.id, 'stats', 'computing']);
}

function setWaiting({props, state}) {
  state.set(['App', 'model', 'notes', props.id, 'stats', 'computing'], true);
}

function setMarkerPosition({props, state}) {
  let id = state.get('App.view.selected_note');
  state.set(['App', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0, props.idx], [props.lng, props.lat])
}

function recalculateArea({state}) {
  let id = state.get(['App', 'view', 'selected_note']);
  let note = state.get(['App', 'model', 'notes', id]);
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      let area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(['App', 'model', 'notes', id, 'area'], area);
    }
  }
}

function undo({props, state}) {
  let id = state.get(['App', 'view', 'selected_note']);
  let points = state.get(['App', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  if (points.length > 0) {
    state.pop(['App', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  }
}

function mapToFieldPolygon({props, state}) {
  var field = state.get(['App', 'model', 'fields', props.id]);
  if (field) state.set(['App', 'view', 'map', 'map_location'], field.boundary.centroid);
}

function computeNoteStats({props, state, path}) {
  let token = state.get('App.settings.data_sources.yield.oada_token');
  let domain = state.get('App.settings.data_sources.yield.oada_domain');
  let availableGeohashes = state.get(['App', 'model', 'yield_data_index']);
  let baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  let geometry = state.get(['App', 'model', 'notes', props.id, 'geometry']);
  return yieldDataStatsForPolygon(geometry.geojson.coordinates[0], geometry.bbox, availableGeohashes, baseUrl, token)
  .then((data) => {
    return path.success({geohashPolygons: data.geohashPolygons, stats: data.stats, ids:[props.id]});
  })
}

function setNoteStats({props, state}) {
  Object.keys(props.stats).forEach(function(crop) {
    if (isNaN(props.stats[crop].mean_yield)) {
      state.unset(['App', 'model', 'notes', props.id, 'stats', crop]);
    } else {
      state.set(['App', 'model', 'notes', props.id, 'stats', crop], props.stats[crop]);
    }
  })
  state.unset(['App', 'model', 'notes', props.id, 'stats', 'computing']);
}

function toggleCropLayer({input, state}) {
  var vis = state.get(['App', 'view', 'map', 'crop_layers', input.crop, 'visible']);
  state.set(['App', 'view', 'map', 'crop_layers', input.crop, 'visible'], !vis);
}

function getNoteBoundingBox({props, state}) {
  let selectedNote = state.get('App.view.selected_note');
  let notes = state.get(['App', 'model', 'notes']);
  let bbox = computeBoundingBox(notes[selectedNote].geometry.geojson);
  state.set(['App', 'model', 'notes', selectedNote, 'geometry', 'bbox'], bbox);
  state.set(['App', 'model', 'notes', selectedNote, 'geometry', 'centroid'], [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2]);
}

function dropPoint ({props, state}) {
  let id = state.get(['App', 'view', 'selected_note']);
  state.push(['App', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], props.pt);
}

function validateNoteText({props, state}) {
}
