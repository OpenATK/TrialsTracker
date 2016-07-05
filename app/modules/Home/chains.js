import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import geolib from 'geolib';
import md5 from 'md5';
import PouchDB from 'pouchdb';
import oadaIdClient from 'oada-id-client';
import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
var geohashesUrl = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/';
import gjArea from 'geojson-area';


export var initialize = [
  createDb, getAccessToken, {
    success: [storeToken], 
    error: [],
  },
  requestAvailableGeohashes, {
    success: [storeAvailableGeohashes],
    error: [],
  },
  prepNoteStats,
];

export var changeSortMode = [
  setSortMode
];

export var handleNoteClick = [
  selectNote,
];

export var removeNote = [
  unselectIfSelected, checkTags, deleteNote, 
];

export var textInputChanged = [
  setTextInputValue
];

export var changeShowHideState = [
];

export var addNewNote = [
  unselectNote, createNote, selectNote, setDrawMode
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleAuth = [
  storeToken,
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

export var handleTileGeohash = [
  storeGeohash, 
];

export var removeGeohashes = [
  unregisterGeohashes,
];

export var addGeohashes = [
  registerGeohashes,
];

export var updateGeohashes = [
  storeNewGeohashes,
];

export var markGeohashDrawn = [
  markDrawn,
];

function markDrawn({input, state}) {
  input.geohashes.forEach((geohash) => {
    state.set(['home', 'model', 'current_geohashes', geohash, 'drawn'], true);
  });
};

function filterCurrentGeohashes({state}) {
  var i = 0;
  var availableGeohashes = state.get(['home', 'model', 'available_geohashes']);
  var currentGeohashes = state.get(['home', 'model', 'current_geohashes']);
  var geohashes = Object.keys(currentGeohashes);
// The geohashes on screen are filtered here so only those with available data are added.
  geohashes.forEach((geohash) => {
    if (!availableGeohashes[geohash]) {
      i++;
      state.unset(['home', 'model', 'current_geohashes', geohash]);
    }
  });
  console.log('unset ' + i +' geohashes');
};

function registerGeohashes({input, state}) {
  console.log('registering geohashes');
  var availableGeohashes = state.get(['home', 'model', 'available_geohashes']);
// This case occurs before a token is available.  Just save all geohashes and
// filter them later with filterCurrentGeohashes when the list of available
// geohashes becomes known.
  if (Object.keys(availableGeohashes).length === 0) {
    input.geohashes.forEach((geohash) => {
      state.set(['home', 'model', 'current_geohashes', geohash], {drawn: false});
    });

// If the available geohashes are known, save each geohash's _rev
  } else {
    input.geohashes.forEach((geohash) => {
      state.set(['home', 'model', 'current_geohashes', geohash], { 
        _rev: availableGeohashes[geohash]._rev,
        drawn: false,
      });
    });
  }
};

function unregisterGeohashes({input, state}) {
 // console.log('unregistering geohashes (actually setting drawn to false)');
  input.geohashesToRemove.forEach((geohash) => {
    state.set(['home', 'model', 'current_geohashes', geohash, 'drawn'], false);
  });
};

function storeNewGeohashes({input, state}) {
  var currentGeohashes = state.get(['home', 'model', 'current_geohashes']);
  var availableGeohashes = state.get(['home', 'model', 'available_geohashes']);
  input.geohashes.forEach((geohash) => {
    state.set(['home', 'model', 'current_geohashes', geohash, '_rev'], availableGeohashes[geohash]._rev);
//    state.set(['home', 'model', 'current_geohashes', geohash, 'drawn'], false);
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

function computeArea(vertices) {
  var latlngs = [];
  for (var i = 0; i < vertices.length; i++) {
    latlngs.push([vertices[i].longitude, vertices[i].latitude]);
  }
  latlngs.push([vertices[0].longitude, vertices[0].latitude]);
  var geojson = { 
    "type": "Polygon",
    "coordinates": [latlngs],
  };
  // calculate area and convert to acres
  return gjArea.geometry(geojson)/4046.86; 
};

function prepNoteStats({state}) {
/*
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var db = new PouchDB('yield-data');
  var notes = state.get(['home', 'model', 'notes']);
  _.each(notes, function(note, id) {
    var bbox = computePolygonBoundingBox(note.geometry);
    state.set(['home', 'model', 'notes', id, 'bbox'], bbox);
    var geohashes = gh.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, 7);
    var vertices = state.get(['home', 'model', 'notes', id, 'geometry']);
    var area = computeArea(vertices).toFixed(2);
    state.set(['home', 'model', 'notes', id, 'area'], area); 
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
            sum += parseFloat(pt.value);
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
      state.set(['home', 'model', 'notes', id, 'mean'], (sum/count).toFixed(2));
      state.set(['home', 'model', 'notes', id, 'count'], count);
    });
  });
*/
};

function createDb({}) {
  var db = new PouchDB('yield-data');
};

function setNewData({input, state}) {
  console.log('setting new data value');
  state.set(['home', 'dummy_value'], input.value+1);
};

function sendNewData({state, output}) {
  var token = state.get(['home', 'token']).access_token;
  console.log('sending new data');
  var value = state.get(['home', 'dummy_value']);
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


function storeGeohash({input, state}) {
  var currentGeohashes = state.get(['home', 'model', 'current_geohashes']);
  console.log(currentGeohashes);
  console.log(input.rev, currentGeohashes[input.geohash]);
  if (input.rev !== currentGeohashes[input.geohash]) {
    console.log('updating current geohashes');
    state.set(['home', 'model', 'current_geohashes', input.geohash], input.rev); 
  }
};

function startStopTimer({input, state}) {
  if (state.get(['home', 'live_data'])) {
    state.set(['home', 'live_data'], 'false');
  } else {
    state.set(['home', 'live_data'], 'true');
  }
};

function requestAvailableGeohashes ({state, output}) {
  console.log('requesting newest geohash revs');
  var token = state.get(['home', 'token']).access_token;
  var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-';
  var geohashes = {};
  Promise.map([2,3,4,5,6,7], (level) => {
    return agent('GET', url+level+'/')
    .set('Authorization', 'Bearer '+ token)
    .end()
    .then(function(res) {
      Object.keys(res.body).forEach(function(key) {
        if (key.charAt(0) !== "_") {
          geohashes[key] = res.body[key];
        }
      });
    });
  }).then(() => {
    output.success({geohashes});
  });
};
requestAvailableGeohashes.outputs = ['success', 'error'];
requestAvailableGeohashes.async = true;

function checkRevs ({input, state}) {
  var db = new PouchDB('yield-data');
  var token = state.get(['home', 'token']).access_token;
  var currentGeohashes = state.get(['home', 'model', 'current_geohashes']);
  console.log(currentGeohashes.dp68rsz);
  var geohashesToCheck = { dp68rsz: currentGeohashes.dp68rsz}; //hard code geohashes here
//TODO: Enable the next line eventually. current_geohashes should likely
//      contain the set of geohashes on screen at all times. It could also
//      be a user-specified area -> geohashes to monitor.
//  var geohashesToCheck = state.get(['home', 'view', 'current_geohashes']);
//  var availableGeohashes = state.get(['home', 'model', 'availableGeohashes']);
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
          state.set(['home', 'model', 'current_geohashes', key], response.body._rev);
          db.put({jsonData: response.body}, key).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          });
        });   
    }
  });
};

function storeAvailableGeohashes({input, state}) {
  console.log('storing available geohashes');
  state.set(['home', 'model', 'available_geohashes'], input.geohashes)
};

function setDrawMode({input, state}) {
  state.set(['home', 'view', 'drawMode'], input.drawMode); 
};

function getAccessToken({input, state, output}) {
  var self = this;
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9vYXV0aDIvcmVkaXJlY3QuaHRtbCJdLCJ0b2tlbl9lbmRwb2ludF9hdXRoX21ldGhvZCI6InVybjppZXRmOnBhcmFtczpvYXV0aDpjbGllbnQtYXNzZXJ0aW9uLXR5cGU6and0LWJlYXJlciIsImdyYW50X3R5cGVzIjpbImltcGxpY2l0Il0sInJlc3BvbnNlX3R5cGVzIjpbInRva2VuIiwiaWRfdG9rZW4iLCJpZF90b2tlbiB0b2tlbiJdLCJjbGllbnRfbmFtZSI6IlRyaWFscyBUcmFja2VyIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vZ2l0aHViLmNvbS9PcGVuQVRLL1RyaWFsc1RyYWNrZXItQ2VyZWJyYWwiLCJjb250YWN0cyI6WyJTYW0gTm9lbCA8c2Fub2VsQHB1cmR1ZS5lZHUiXSwic29mdHdhcmVfaWQiOiIzMmQ3NjNkNy02NzZlLTQ5MzItOTk4NS0xOGMyYjIxYjlmNDkiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTQ2NDM3NTQ4M30.qC1cmAspdusal-o3bjQIJNls_KJtwYJMr_WODJkUM-3ltp3FHsPC1-eqdpsAbC7WrSJqwi_55J26UCL0jqRYNT5M_szIhRy5-XRvMhHJ8XDE54bFgI45dz5S5fcuGC0ehETyCyvrlsHomIIqKz-LyvIwbOUpNThIpruEMvNgW-Q',
    scope: 'some.oada.defined.scope',
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
  state.set(['home', 'token'], input.token);
};

function changeShowHide ({input, state}) {
  var geometryVisible = state.get(['home', 'model', 'notes', input.id, 'geometry_visible']);
  if (geometryVisible) {
    state.set(['home', 'model', 'notes', input.id, 'geometry_visible'], false);
  } else {
    state.set(['home', 'model', 'notes', input.id, 'geometry_visible'], true);
  }
};

function setSortMode ({input, state}) {
  state.set(['home', 'view', 'sort_mode'], input.newSortMode);
};

function unselectNote ({input, state}) {
  state.set(['home', 'model', 'selected_note'], {});
};

function selectNote ({input, state}) {
  //check that the selected note isn't already selected
  if (state.get(['home', 'model', 'selected_note']) !== input.note) {
    // set the status of the currently selected note to "unselected"
    if (!_.isEmpty(state.get(['home', 'model', 'selected_note']))) {
      state.set(['home', 'model', 'notes', state.get(['home', 'model', 'selected_note']), 'selected'], false);
    }
    state.set(['home', 'model', 'selected_note'], input.note);
    state.set(['home', 'model', 'notes', input.note, 'selected'], true);
/*
   // loop through each tag of each note, 
    _.each(state.get(['home', 'model', 'notes']), function(note) {
      _.each(note.tags, function(tag) {
        if (!_.includes(state.get(['home','model', 'tags']), tag)) {
          state.set(['home', 'model', 'tags', tag], {
            text: tag,
            references: 1,
          });
        } else {
          var refs = state.get(['home', 'model', 'tags', tag, 'references']);
          state.set(['home', 'model', 'tags', tag, 'references'], refs++);
        }
      });
    });
*/
  }
};

function setTextInputValue ({input, state}) {
  state.set(['home', 'model', 'notes', input.noteId, 'text']);
};
 
function unselectIfSelected ({input, state}) {
  if (input.id === state.get(['home', 'model', 'selected_note'])) {
    state.set(['home', 'model', 'selected_note'], {});
  }
};

function checkTags ({input, state}) {
  _.each(state.get(['home', 'model', 'notes', input.id, 'tags']), function(tag) {
    if (_.has(state.get(['home', 'model', 'tags']), tag) && state.get(['home', 'model', 'tags', tag, 'references']) === 1) {
      state.unset(['home', 'model', 'tags', tag]); 
    }
  });
};

function deleteNote({input, state}) {
  state.unset(['home', 'model', 'notes', input.id]); 
};

function updateTagsList({state}) {
  _.each(state.get(['home', 'model', 'notes']), function(note) {
    _.each(note.tags, function(tag) {
      if (!_.includes(state.get(['home','model', 'tags']),tag)) {
        state.set(['home', 'model', 'tags', tag], {
          text: tag,
          references: 1,
        });
      } else {
        var refs = state.get(['home', 'model', 'tags', tag, 'references']);
        state.set(['home', 'model', 'tags', tag, 'references'], refs++);
      }
    });
  });
};

function createNote({state, output}) {
  var newNote = {
    id: uuid.v4(),
    text: '',
    tags: [],
    fields: [],
    geometry: [],
//    geojson: { "type":"Polygon",
//      "coordinates": [
//        []
//      ]
//     },
     geometry_visible: 'Show',
     color: getColor(),
     completions: [],
     selected: true,
  };
  state.set(['home', 'model', 'notes', newNote.id], newNote);
  output({note: newNote.id});
};

function getColor() {
  var r = (Math.round(Math.random()*127) + 127).toString(16);
  var g = (Math.round(Math.random()*127) + 127).toString(16);
  var b = (Math.round(Math.random()*127) + 127).toString(16);
  return '#' + r.toString() + g.toString() + b.toString();
}
