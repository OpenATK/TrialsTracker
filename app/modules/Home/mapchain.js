import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import PouchDB from 'pouchdb';

var mouse_up_flag = false;
var mouse_down_flag = false;

export var handleMouseDown = [
 dropPoint 
];

export var mouseMoveOnmap = [
  mapMouseMove
];

export var mouseUpOnmap = [
  mapMouseUp
];

export var ToggleMap = [
  dragMapToggle
];

export var mouseDown = [
  
];

export var drawOnMap = [
];

export var drawComplete = [
  setDrawMode, computeBoundingBox, computeStats
];

function computeStats({input, state}) {
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var db = new PouchDB('yield-data');
  var bbox = input.bbox;
  var geohashes = gh.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, 7);
  var vertices = state.get(['home', 'model', 'notes', input.id, 'geometry']);
  var sum = 0;
  var count = 0;
  var promises = [];
  for (var g = 0; g < geohashes.length; g++) {
    var promise = db.get(geohashes[g])
    .then(function(geohashData) {
      _.each(geohashData.jsonData.data, function(pt) {
        var point = {
          latitude: pt.location.lat,
          longitude: pt.location.lon
        };
        if (geolib.isPointInside(point, vertices)) {
          sum = sum + parseFloat(pt.value);
          count++;
          return true;
        }
      });
    }).catch(function(err) {
      console.log(err);
    });
    promises.push(promise);
  }
  return Promise.all(promises).then(function() {
  }).then(function(result) {
    state.set(['home', 'model', 'notes', input.id, 'mean'], (sum/count).toFixed(2));
    state.set(['home', 'model', 'notes', input.id, 'count'], count);
  });
};


function computeBoundingBox({input, state, output}) {
  var vertices = state.get(['home', 'model', 'notes', input.id, 'geometry']);
  var north = vertices[0].latitude;
  var south = vertices[0].latitude;
  var east = vertices[0].longitude;
  var west = vertices[0].longitude;
  for (var i = 0; i < vertices.length; i++) {
    if (vertices[i].latitude > north) north = vertices[i].latitude;
    if (vertices[i].latitude > south) south = vertices[i].latitude;
    if (vertices[i].longitude > east) east = vertices[i].longitude;
    if (vertices[i].longitude < west) west = vertices[i].longitude;
  }
  var bbox = {
    north: north,
    south: south,
    east: east,
    west: west,
  };
  state.set(['home', 'model', 'notes', input.id, 'bbox'], bbox);
  output({bbox: bbox});
};

function setDrawMode({input, state}) {
  state.set(['home', 'view', 'drawMode'], input.drawMode); 
};

function dropPoint ({input, state}) {
  if(state.get(['home', 'view', 'drawMode']) == true){
    mouse_up_flag = false;
    var vertex = {latitude: input.pt.lat, longitude: input.pt.lng};
    var currentSelectedNoteId = input.select_note;
    _.each(state.get(['home', 'model', 'notes']), function(note) {
      if (note.id === currentSelectedNoteId) {
        state.push(['home', 'model', 'notes', note.id, 'geometry'], vertex);
      }
    });
    mouse_down_flag = true;
  }
};

function mapMouseMove ({input, state}) {
  if(state.get(['home', 'view', 'drawMode']) === true){
    var vertex = [input.vertex_value.lng, input.vertex_value.lat];
    var currentSelectedNoteId = input.selected_note;

    if (mouse_up_flag === true) {
      mouse_down_flag = false;
    }
  
    if (mouse_down_flag === true) {
      _.each(state.get(['home', 'model', 'notes']), function(note) {
        if(note.id === currentSelectedNoteId){
        
          var coor_array = state.get(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']);
          var coor_arr_length = coor_array.length;

          state.set(['home', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0', (coor_arr_length-1)], vertex);
        }
      });
    }
  }
};

function mapMouseUp ({input, state}) {
  if(state.get(['home', 'view', 'drawMode']) === true){
    mouse_up_flag = true;
  }
};


function dragMapToggle ({state}) {
  if (state.get(['home', 'view', 'drag'])) {
    state.set(['home', 'view', 'drag'], false);
  } else {
    state.set(['home', 'view', 'drag'], true);
  }
};
