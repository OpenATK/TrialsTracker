import { set, toggle } from 'cerebral/operators';
import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import cache from '../Cache/cache.js';
import gju from 'geojson-utils';
import gjArea from '@mapbox/geojson-area';
import computeBoundingBox from './utils/computeBoundingBox.js';
import polygonsIntersect from './utils/polygonsIntersect.js';
import getFieldDataForNotes from './actions/getFieldDataForNotes.js';
import yieldDataStatsForPolygon from './actions/yieldDataStatsForPolygon.js';

export var startMovingMap = [
  set('state:app.view.map.moving', true)
];

export var doneMovingMap = [
  set('state:app.view.map.moving', false)
];

export var calculatePolygonArea = [
  recalculateArea,
];

export var handleMouseDown = [
 dropPoint
];

export var undoDrawPoint = [
  undo, recalculateArea,
];

export var drawComplete = [
  set('state:app.view.map.drawing_note_polygon', false), 
  setWaiting,
  getNoteBoundingBox, {
    success: [
      setNoteBoundingBox, 
      computeNoteStats, {
        success: [
          setNoteStats, 
          getFieldDataForNotes
        ],
        error: [],
      }
    ],
    error: [],
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

function setNoteFields({input, state}) {
  var note = state.get(['app', 'model', 'notes', input.id]);
  var fields = state.get(['app', 'model', 'fields']);
  Object.keys(fields).forEach((field) => {
    if (polygonsIntersect(fields[field].boundary.geojson.coordinates[0], note.geometry.geojson.coordinates[0])) {
      //get the field average for each crop and compare to note average
      var obj = {};
      Object.keys(fields[field].stats).forEach((crop) => {
        if (note.stats[crop]) {
          obj[crop] = {
            difference: note.stats[crop].mean_yield - fields[field].stats[crop].mean_yield
          }
        }
      })
      state.set(['app', 'model', 'notes', input.id, 'fields', field], obj);
    }
  })
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

function recalculateArea({state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', id]);
  var area;
  if (note.geometry.geojson) {
    if (note.geometry.geojson.coordinates[0].length > 2) {
      area = gjArea.geometry(note.geometry.geojson)/4046.86;
      state.set(['app', 'model', 'notes', id, 'area'], area);
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
  var polygon = state.get(['app', 'model', 'notes', input.id, 'geometry', 'geojson', 'coordinates'])[0];
  yieldDataStatsForPolygon(polygon, input.bbox, availableGeohashes, baseUrl, token)
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
  var notes = state.get(['app', 'model', 'notes']);
  var bbox = computeBoundingBox(notes[input.id].geometry.geojson);
  var area = gjArea.geometry(notes[input.id].geometry.geojson)/4046.86; 
  output.success({bbox, area});
}

function setNoteBoundingBox({input, state, output}) {
  state.set(['app', 'model', 'notes', input.id, 'geometry', 'bbox'], input.bbox);
  state.set(['app', 'model', 'notes', input.id, 'geometry', 'centroid'], [(input.bbox.north + input.bbox.south)/2, (input.bbox.east + input.bbox.west)/2]);
  state.set(['app', 'model', 'notes', input.id, 'area'], input.area);
}

function dropPoint ({input, state}) {
  var drawing = state.get(['app', 'model', 'view', 'map', 'drawing_note_polygon']);
  var moving = state.get(['app', 'model', 'view', 'map', 'moving']);
  if (!drawing && !moving) {
    var id = state.get(['app', 'view', 'selected_note']);
    state.push(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], input.pt);
  }
}
