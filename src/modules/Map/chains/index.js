import { set, toggle } from 'cerebral/operators';
import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import cache from '../../Cache';
import gju from 'geojson-utils';
import gjArea from '@mapbox/geojson-area';
import computeBoundingBox from '../utils/computeBoundingBox.js';
import polygonsIntersect from '../utils/polygonsIntersect.js';
import getFieldDataForNotes from '../actions/getFieldDataForNotes.js';
import yieldDataStatsForPolygon from '../actions/yieldDataStatsForPolygon.js';

export var startMovingMap = [
  set('state:app.view.map.moving', true)
];

export var doneMovingMap = [
  set('state:app.view.map.moving', false)
];

export var handleMapClick = [
  dropPoint, 
  recalculateArea, 
  getNoteBoundingBox, 
];

export var handleLocationFound = [
  setCurrentLocation,
];

export var undoDrawPoint = [
  undo, 
  recalculateArea,
  getNoteBoundingBox
];

export var drawComplete = [
  set('state:app.view.editing_note', false), 
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

export var endMarkerDrag = [
  set('state:app.view.map.dragging_marker', false),
];

export var startMarkerDrag = [
  set('state:app.view.map.dragging_marker', true),
];

export var markerDragging = [
  setMarkerPosition, 
  recalculateArea
];

export var handleCurrentLocationButton = [
  setMapToCurrentLocation,
]

export var handleMapMoved = [
  setMapLocation,
];

function setMapToCurrentLocation({input, state}) {
  var loc = state.get(['app', 'model', 'current_location']);
  if (loc) state.set(['app', 'view', 'map', 'map_location'], [loc.lat, loc.lng]);
}

function setMapLocation({input, state}) {
  state.set(['app', 'view', 'map', 'map_location'], [input.latlng.lat, input.latlng.lng]);
  state.set(['app', 'view', 'map', 'map_zoom'], input.zoom);
}

function setCurrentLocation({input, state}) {
  var obj = {
    lat: input.lat,
    lng: input.lng,
  }
  state.set(['app', 'model', 'current_location'], obj);
}

function setEmptyPolygon({input, state}) {
  state.unset(['app', 'model', 'notes', input.id, 'stats', 'computing']);
}

function toggleMapMoving({state}) {
  var moving = state.get(['app', 'view', 'map', 'moving']);
  state.set(['app', 'view', 'map', 'moving'], !moving);
}

function setWaiting({input, state}) {
  state.set(['app', 'model', 'notes', input.id, 'stats', 'computing'], true);
}

function setMarkerPosition({input, state}) {
  var id = state.get('app.view.selected_note');
  state.set(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0, input.idx], [input.lng, input.lat])
}

function recalculateCentroid({input, state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', id]);
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(['app', 'model', 'notes', id, 'area'], area);
    }
  }
}

function recalculateArea({state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', id]);
  var area;
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(['app', 'model', 'notes', id, 'area'], area);
  //  } else {
  //    state.set(['app', 'model', 'notes', id, 'area'], null);
    }
  }
}

function undo({input, state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  var points = state.get(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  if (points.length > 0) {
    state.pop(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0]);
  }
}

//http://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
function longestCommonPrefix(strings) {
  var A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

function computeNoteStats({input, state, output}) {
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var geometry = state.get(['app', 'model', 'notes', input.id, 'geometry']);
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
  var selectedNote = state.get('app.view.selected_note');
  var notes = state.get(['app', 'model', 'notes']);
  var bbox = computeBoundingBox(notes[selectedNote].geometry.geojson);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'bbox'], bbox);
  state.set(['app', 'model', 'notes', selectedNote, 'geometry', 'centroid'], [(bbox.north + bbox.south)/2, (bbox.east + bbox.west)/2]);
}

function dropPoint ({input, state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  state.push(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], input.pt);
}

function validateNoteText({input, state}) {
}
