import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import geolib from 'geolib';
import md5 from 'md5';
import oadaIdClient from 'oada-id-client';
import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
var geohashesUrl = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/';
import gjArea from 'geojson-area';
import gju from 'geojson-utils';
import initializeMap from './map-chains.js';
import PouchDB from 'pouchdb';
import cache from '../../components/RasterLayer/cache.js';

export var initialize = [
  getAccessToken, {
    success: [storeToken], 
    error: [],
  },
  requestAvailableGeohashes, {
    success: [storeAvailableGeohashes],
    error: [],
  },
//  prepNoteStats, //computeBoundingBox, computeStats
  drawGeohashesOnScreen,
];

export var addTag = [
  addTagToNote, addTagToAllTagsList,
];

export var removeTag = [
  removeTagFromNote, removeTagFromAllTagsList,
];

export var handleNoteListClick = [
  deselectNote, exitEditMode,
];

export var enterNoteEditMode = [
  enterEditMode,
];

export var exitNoteEditMode = [
  exitEditMode,
];

export var changeSortMode = [
  setSortMode
];

export var handleNoteClick = [
  deselectNote, exitEditMode, selectNote,
];

export var removeNote = [
  deselectNote, checkTags, deleteNote, 
];

export var textInputChanged = [
  setTextInputValue
];

export var changeShowHideState = [
];

export var addNewNote = [
  deselectNote, createNote, selectNote, setDrawMode
];

export var changeShowHideState = [
  changeShowHide, 
];

export var makeLiveDataRequest = [
  sendNewData, {
    success: [setNewData, requestAvailableGeohashes, {
      success: [checkRevs],
      error: [],
    }],
    error: [],
  },
];

export var startStopLiveData = [
  startStopTimer,
];

export var removeGeohashes = [
  unregisterGeohashes,
];

export var addGeohashes = [
  registerGeohashes,
];

export var clearCache = [
  destroyCache,
];

//Fired after a token is acquired; the list of available geohashes on the
//server will be available at this point. Filter the geohashes on screen
//for the geohashes that are available on the server.
function drawGeohashesOnScreen({state}) {
  console.log('fired signal drawGeohashesOnScreen');
  var availableGeohashes = state.get(['app', 'model', 'available_geohashes']);
  var geohashesOnScreen = state.get(['app', 'model', 'geohashes_on_screen']);
  var geohashesToDraw = [];
  Object.keys(geohashesOnScreen).forEach((geohash) => {
    if (availableGeohashes[geohash]) {
      geohashesToDraw.push(geohash);
    }
  });
  state.set(['app', 'model', 'geohashes_to_draw'], geohashesToDraw);
};

function destroyCache() {
  var db = new PouchDB('yield-data');
  db.destroy();
};

function exitEditMode({state}) {
  state.set(['app', 'view', 'editing_note'], false);
};

function enterEditMode({state}) {
  state.set(['app', 'view', 'editing_note'], true);
};

function recursiveGeohashSum(polygon, geohash, stats, db, token, availableGeohashes) {
  console.log('AAAA - recursive stats', geohash, geohash.length);
  return Promise.try(function() {
    if (geohash.length == 7) {
      console.log('getting raw data');
      if (!availableGeohashes[geohash]) return null;
      return cache.get(geohash, token, db)
      .then(function(data) {
        console.log('HHHH - got stats from cache/server', geohash, geohash.length);
        console.log(geohash, data);
        if (!data) return null;
        var pts = Object.keys(data.data);
        var newStats = {
          sum: 0,
          count: 0,
        };
        return Promise.map(pts, function(pt) {
          var pnt = {"type":"Point","coordinates": [data.data[pt].location.lon, data.data[pt].location.lat]};
          if (gju.pointInPolygon(pnt, polygon)) {
            console.log('contained');
            newStats.sum += data.data[pt].value;
            newStats.count++;
          } 
          return null;
        }).then(function() {
          console.log(newStats);
          return newStats;
        });
      });
    }

    var ghBox = gh.decode_bbox(geohash);
    //create an array of vertices in the order [nw, ne, se, sw]
    var polyIn = [
      [ghBox[1], ghBox[2]],
      [ghBox[3], ghBox[2]],
      [ghBox[3], ghBox[0]],
      [ghBox[1], ghBox[0]],
      [ghBox[1], ghBox[2]],
    ];
//Test for intersection; If so, get finer geohash
    for (var i = 0; i < polygon.coordinates[0].length-1; i++) {
      for (var j = 0; j < polyIn.length-1; j++) {
        var lineA = {"type": "LineString", "coordinates": [polygon.coordinates[0][i], polygon.coordinates[0][i+1]]};
        var lineB = {"type": "LineString", "coordinates": [polyIn[j], polyIn[j+1]]};
        if (gju.lineStringsIntersect(lineA, lineB)) {
          console.log('going deeper');
          //partially contained, dig into deeper geohashes
          var geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
          console.log(geohash, geohashes);
          return Promise.map(geohashes, function(geohash) {
            return recursiveGeohashSum(polygon, geohash, stats, db, token, availableGeohashes)
            .then(function (newStats) {
              console.log('CCCC - .then on recurs inside promise.map', geohash, geohash.length);
              console.log(newStats);
/*
              stats.area_sum += data.aggregates.stats.area_sum;
              stats.bushels_sum += data.aggregates.stats.bushels_sum;
              stats.count += data.aggregates.stats.count;
*/
              stats.sum += newStats.sum;
              stats.count += newStats.count;
              return stats;
            });
          }).then(function() {
            console.log('DDDD - .then on recurs promise.map', geohash, geohash.length);
            return stats;
          });
        }
      }
    }
// No intersection. Test if completely inside. If so, use the stats.
    console.log('no intersection');
    var pt = {"type":"Point","coordinates": polyIn[0]};
    if (gju.pointInPolygon(pt, polygon)) {
      console.log('completely in; getting geohash');
      if (!availableGeohashes[geohash]) return null;
      return cache.get(geohash.substr(0, geohash.length-3), token, db)
      .then(function(data) {
        console.log('BBBB - got stats from cache/server', geohash, geohash.length);
        console.log(data.aggregates[geohash].stats);
/*
        stats.area_sum += data.aggregates.stats.area_sum;
        stats.bushels_sum += data.aggregates.stats.bushels_sum;
        stats.count += data.aggregates.stats.count;
*/
        var newStats = {
          sum: data.aggregates[geohash].stats.sum,
          count: data.aggregates[geohash].stats.count,
        };
        console.log(newStats);
        return newStats;
      });
    }
    return null;
  }).then(function(newStats) {
    console.log('EEEE - .then on recurs promise.try', geohash, geohash.length);
    console.log(newStats);
    return newStats;
  });
}

//http://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
function longestCommonPrefix(strings) {
  console.log(strings);
  var A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

function computeStats({input, state}) {
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var db = new PouchDB('yield-data');
//  for (var i = 0; i < input.bboxes.length; i++) {
  Promise.map(input.bboxes, function(bbox, i) {
//    var bbox = input.bboxes[i];
    var id = input.ids[i];
    var nw = L.latLng(bbox.north, bbox.west),
        ne = L.latLng(bbox.north, bbox.east),
        se = L.latLng(bbox.south, bbox.east),
        sw = L.latLng(bbox.south, bbox.west);
    var strings = [gh.encode(bbox.north, bbox.west, 9),
      gh.encode(bbox.north, bbox.east, 9),
      gh.encode(bbox.south, bbox.east, 9),
      gh.encode(bbox.south, bbox.west, 9)];
    var commonString = longestCommonPrefix(strings);
    var polygon = state.get(['app', 'model', 'notes', id, 'geometry']);
    var geohashes = gh.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, commonString.length+1);
    var stats = {
 //     area_sum: 0,
 //     bushels_sum: 0,
      sum: 0,
      count: 0,
    };
    var token = state.get(['app', 'token']).access_token;
    console.log(geohashes);
    var availableGeohashes = state.get(['app', 'model', 'available_geohashes']);
    console.log(availableGeohashes);
    return Promise.map(geohashes, function(geohash) {
      return recursiveGeohashSum(polygon, geohash, stats, db, token, availableGeohashes)
      .then(function(newStats) {
        console.log('GGGG - .then on computeStats recurs promise', geohash, geohash.length);
        console.log(newStats);
/*
        stats.area_sum += newStats.area_sum;
        stats.bushels_sum += newStats.bushels_sum;
        stats.count += newStats.count;
*/
        stats.sum += newStats.sum;
        stats.count += newStats.count;
        return stats;
      });
    }).then(function() {
      console.log('FFFF - The End.  .then on computeStats promise.map');
      console.log(stats);
//      state.set(['app', 'model', 'notes', id, 'area_sum'], stats.area_sum);
//      state.set(['app', 'model', 'notes', id, 'bushels_sum'], stats.bushels_sum);
      state.set(['app', 'model', 'notes', id, 'sum'], stats.sum);
      state.set(['app', 'model', 'notes', id, 'count'], stats.count);
      state.set(['app', 'model', 'notes', id, 'mean'], stats.sum/stats.count);
    });
  });
};



function computeBoundingBox({input, state, output}) {
  var bboxes = [];
  for (var i = 0; i < input.ids.length; i++) {
    var id = input.ids[i];
    var coords = state.get(['app', 'model', 'notes', id, 'geometry', 'coordinates', 0]);
    var north = coords[0][1];
    var south = coords[0][1];
    var east = coords[0][0];
    var west = coords[0][0];
    for (var j = 0; j < coords.length; j++) {
      if (coords[j][1] > north) north = coords[j][1];
      if (coords[j][1] < south) south = coords[j][1];
      if (coords[j][0] > east) east = coords[j][0];
      if (coords[j][0] < west) west = coords[j][0];
    }
    var bbox = {north, south, east, west};
    state.set(['app', 'model', 'notes', id, 'bbox'], bbox);
    bboxes.push(bbox);
  }
  output({bboxes});
};

function prepNoteStats({state, output}) {
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var db = new PouchDB('yield-data');
  var notes = state.get(['app', 'model', 'notes']);
  var ids = [];
  Object.keys(notes).forEach(function(key) {
    var note = notes[key];
    if (!note.area) {
      var area = gjArea.geometry(note.geometry)/4046.86; 
      state.set(['app', 'model', 'notes', key, 'area'], area);
    }
    if (!note.bbox) {
      ids.push(note.id);
    }
  });
  if (ids.length > 0) output({ids});
};


function registerGeohashes({input, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later with filterCurrentGeohashes when the list of available
// geohashes becomes known.
  console.log('registering geohashes');
  input.geohashes.forEach((geohash) => {
    state.set(['app', 'model', 'geohashes_on_screen', geohash], geohash)
  });
}

function unregisterGeohashes({input, state}) {
  console.log('unregistering geohashes');
  input.geohashesToRemove.forEach((geohash) => {
    state.unset(['app', 'model', 'geohashes_on_screen', geohash]);
  });
};

function computePolygonBoundingBox(vertices, id) {
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
  return bbox;
};

function setNewData({input, state}) {
  console.log('setting new data value');
  state.set(['app', 'dummy_value'], input.value+1);
};

function sendNewData({state, output}) {
  var token = state.get(['app', 'token']).access_token;
  console.log('sending new data');
  var value = state.get(['app', 'dummy_value']);
  return agent('PUT', geohashesUrl+'dp68rsz/data/bd82151e-462c-4631-9b18-8024a8aa2d5f/')
    .set('Authorization', 'Bearer '+ token)
    .send({value: value+1})
    .end()
    .then(function(response) {
      output.success({value});
   });
};
sendNewData.outputs = ['success', 'error'];
sendNewData.async = true;

function startStopTimer({input, state}) {
  if (state.get(['app', 'live_data'])) {
    state.set(['app', 'live_data'], 'false');
  } else {
    state.set(['app', 'live_data'], 'true');
  }
};

//Not currently in use until we try to get live data streaming.
function checkRevs ({input, state}) {
  var db = new PouchDB('yield-data');
  var token = state.get(['app', 'token']).access_token;
  var currentGeohashes = state.get(['app', 'model', 'current_geohashes']);
  console.log(currentGeohashes.dp68rsz);
  var geohashesToCheck = { dp68rsz: currentGeohashes.dp68rsz}; //hard code geohashes here
//TODO: Enable the next line eventually. current_geohashes should likely
//      contain the set of geohashes on screen at all times. It could also
//      be a user-specified area -> geohashes to monitor.
//  var geohashesToCheck = state.get(['app', 'view', 'current_geohashes']);
//  var availableGeohashes = state.get(['app', 'model', 'availableGeohashes']);
  _.each(geohashesToCheck, function(rev, key) {
    console.log(rev);
    console.log(key);
    console.log(input.revs[key]);
    if (input.revs[key] !== rev) {
      console.log('updating!');
      return agent('GET', geohashesUrl+key)
        .set('Authorization', 'Bearer '+ token)
        .end()
        .then(function(response) {
          console.log('setting state');
          state.set(['app', 'model', 'current_geohashes', key], response.body._rev);
          db.put({jsonData: response.body}, key).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          });
        });   
    }
  });
};

function requestAvailableGeohashes ({state, output}) {
  console.log('requesting newest geohash revs');
  var token = state.get(['app', 'token']).access_token;
  var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/';
  var geohashes = {};
  Promise.map([2,3,4,5,6,7], (level) => {
    return cache.get('geohash-'+level, url, token)
    .then(function(res) {
      Object.keys(res).forEach(function(key) {
        if (key.charAt(0) !== "_") {
          geohashes[key] = res[key];
        }
      });
    });
  }).then(function() {
    output.success({geohashes});
  });
};
requestAvailableGeohashes.outputs = ['success', 'error'];
requestAvailableGeohashes.async = true;

function storeAvailableGeohashes({input, state}) {
  console.log('storing list of available geohashes');
  state.set(['app', 'model', 'available_geohashes'], input.geohashes)
};

function setDrawMode({input, state}) {
  state.set(['app', 'view', 'draw_mode'], input.drawMode); 
};

function getAccessToken({input, state, output}) {
  var self = this;
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9vYXV0aDIvcmVkaXJlY3QuaHRtbCJdLCJ0b2tlbl9lbmRwb2ludF9hdXRoX21ldGhvZCI6InVybjppZXRmOnBhcmFtczpvYXV0aDpjbGllbnQtYXNzZXJ0aW9uLXR5cGU6and0LWJlYXJlciIsImdyYW50X3R5cGVzIjpbImltcGxpY2l0Il0sInJlc3BvbnNlX3R5cGVzIjpbInRva2VuIiwiaWRfdG9rZW4iLCJpZF90b2tlbiB0b2tlbiJdLCJjbGllbnRfbmFtZSI6IlRyaWFscyBUcmFja2VyIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vZ2l0aHViLmNvbS9PcGVuQVRLL1RyaWFsc1RyYWNrZXItQ2VyZWJyYWwiLCJjb250YWN0cyI6WyJTYW0gTm9lbCA8c2Fub2VsQHB1cmR1ZS5lZHUiXSwic29mdHdhcmVfaWQiOiIzMmQ3NjNkNy02NzZlLTQ5MzItOTk4NS0xOGMyYjIxYjlmNDkiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTQ2NDM3NTQ4M30.qC1cmAspdusal-o3bjQIJNls_KJtwYJMr_WODJkUM-3ltp3FHsPC1-eqdpsAbC7WrSJqwi_55J26UCL0jqRYNT5M_szIhRy5-XRvMhHJ8XDE54bFgI45dz5S5fcuGC0ehETyCyvrlsHomIIqKz-LyvIwbOUpNThIpruEMvNgW-Q',
    scope: 'yield-data field-notes field-boundaries'
  };
  var domain = 'localhost:3000';
  oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
    if (err) { console.dir(err); output.error(); } // Soemthing went wrong  
    output.success({token:accessToken});
  });
};
getAccessToken.outputs = ['success', 'error'];
getAccessToken.async = true;

function storeToken({input, state}) {
  console.log('token stored');
  state.set(['app', 'token'], input.token);
  state.set('app.offline', false);
};

function changeShowHide ({input, state}) {
  var geometryVisible = state.get(['app', 'model', 'notes', input.id, 'geometry_visible']);
  if (geometryVisible) {
    state.set(['app', 'model', 'notes', input.id, 'geometry_visible'], false);
  } else {
    state.set(['app', 'model', 'notes', input.id, 'geometry_visible'], true);
  }
};

function setSortMode ({input, state}) {
  state.set(['app', 'view', 'sort_mode'], input.newSortMode);
};

function selectNote ({input, state}) {
  //check that the selected note isn't already selected
  if (state.get(['app', 'model', 'selected_note']) !== input.note) {
    // set the status of the currently selected note to "unselected"
    if (!_.isEmpty(state.get(['app', 'model', 'selected_note']))) {
      state.set(['app', 'model', 'notes', state.get(['app', 'model', 'selected_note']), 'selected'], false);
    }
    state.set(['app', 'model', 'selected_note'], input.note);
    state.set(['app', 'model', 'notes', input.note, 'selected'], true);
/*
   // loop through each tag of each note, 
    _.each(state.get(['app', 'model', 'notes']), function(note) {
      _.each(note.tags, function(tag) {
        if (!_.includes(state.get(['app','model', 'tags']), tag)) {
          state.set(['app', 'model', 'tags', tag], {
            text: tag,
            references: 1,
          });
        } else {
          var refs = state.get(['app', 'model', 'tags', tag, 'references']);
          state.set(['app', 'model', 'tags', tag, 'references'], refs++);
        }
      });
    });
*/
  }
};

function setTextInputValue ({input, state}) {
  state.set(['app', 'model', 'notes', input.noteId, 'text'], input.value);
};

function deselectNote ({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'model', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);
};

function checkTags ({input, state}) {
  _.each(state.get(['app', 'model', 'notes', input.id, 'tags']), function(tag) {
    if (_.has(state.get(['app', 'model', 'tags']), tag) && state.get(['app', 'model', 'tags', tag, 'references']) === 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  });
};

function deleteNote({input, state}) {
  state.unset(['app', 'model', 'notes', input.id]); 
};

function updateTagsList({state}) {
  _.each(state.get(['app', 'model', 'notes']), function(note) {
    _.each(note.tags, function(tag) {
      if (!_.includes(state.get(['app','model', 'tags']),tag)) {
        state.set(['app', 'model', 'tags', tag], {
          text: tag,
          references: 1,
        });
      } else {
        var refs = state.get(['app', 'model', 'tags', tag, 'references']);
        state.set(['app', 'model', 'tags', tag, 'references'], refs++);
      }
    });
  });
};

function createNote({state, output}) {
  console.log('new note created');
  var newNote = {
    time: Date.now(),
    id: uuid.v4(),
    text: '',
    tags: [],
    fields: [],
    geometry: { 
      "type":"Polygon",
      "coordinates": [[]],
    },
    geometry_visible: 'Show',
    color: getColor(),
    completions: [],
    selected: true,
  };
  state.set(['app', 'model', 'notes', newNote.id], newNote);
  output({note: newNote.id});
};

function addTagToNote({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  state.concat(['app', 'model', 'notes', note, 'tags'], input.text);
};

function removeTagFromNote({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  var tags = state.get(['app', 'model', 'notes', note, 'tags']);
  var idx = tags.indexOf(input.tag);
  state.splice(['app', 'model', 'notes', note, 'tags'], idx, 1);
};

function addTagToAllTagsList({input, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  if (!allTags[input.text]) {
    state.set(['app', 'model', 'tags', input.text], { 
      text: input.text,
      references: 1
    });
  } else {
    state.set(['app', 'model', 'tags', input.text, 'references'], allTags[input.text].references+1);
  }
};

function removeTagFromAllTagsList({input, state}) {
  var refs = state.get(['app', 'model', 'tags', input.tag, 'references']);
  if (refs == 0) {
    state.unset(['app', 'model', 'tags', input.tag]);
  } else {
    state.set(['app', 'model', 'tags', input.tag, 'references'], refs - 1);
  }
};

function getColor() {
  var r = (Math.round(Math.random()*127) + 127).toString(16);
  var g = (Math.round(Math.random()*127) + 127).toString(16);
  var b = (Math.round(Math.random()*127) + 127).toString(16);
  return '#' + r.toString() + g.toString() + b.toString();
}
