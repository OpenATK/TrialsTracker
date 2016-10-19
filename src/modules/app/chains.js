import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import geolib from 'geolib';
import md5 from 'md5';
import oadaIdClient from 'oada-id-client';
import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
import gju from 'geojson-utils';
import initializeMap from './map-chains.js';
import PouchDB from 'pouchdb';
import cache from '../../components/RasterLayer/cache.js';
import rmc from 'random-material-color';
import Color from 'color';

var drawFirstGeohashes = [
  getToken, {
    success: [storeToken, getAvailableData, {
      success: [setAvailableData],
      error: [],
    }], 
    error: [],
  },
];

export var initialize = [
  getOadaDomain, {
    cached: [setOadaDomain, hideDomainModal, drawFirstGeohashes],
    offline: [],
    fail: [showDomainModal],
  },
];

export var addTag = [
  addTagToNote, addTagToAllTagsList, clearTagText
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
  setDrawMode, deselectNote, checkTags, deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
  setTagText,
];

export var addNewNote = [
  createNote, setDrawMode, enterEditMode,
];

export var changeShowHideState = [
  changeShowHide, 
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

export var updateDomainText = [
  setDomainText,
];

export var submitDomainModal = [
  setOadaDomain, hideDomainModal, drawFirstGeohashes,
];

export var cancelDomainModal = [
  setOadaDomain, hideDomainModal,
];

export var displayDomainModal = [
  showDomainModal,
];

function getAvailableData({state, output}) {
  var token = state.get(['app', 'token']);
  var domain = state.get(['app', 'model', 'domain']);
  var url = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var data = {};
  cache.get(url, token).then(function(crops) {
    return Promise.each(Object.keys(crops), function(crop) {
      data[crop] = {};
      return cache.get(url + crop + '/geohash-length-index', token).then(function(geohashLengthIndex) {
        return Promise.each(Object.keys(geohashLengthIndex), function(ghLength) {
          return cache.get(url + crop + '/geohash-length-index/' + ghLength + '/geohash-index', token).then(function(ghIndex) {
            return Promise.each(Object.keys(ghIndex), function(bucket) {
              return cache.get(url + crop + '/geohash-length-index/' + ghLength + '/geohash-index/' + bucket + '/geohash-data', token).then(function(geohashData) {
                return Promise.each(Object.keys(geohashData), function(geohash) {
                  return data[crop][geohash] = geohash;
                })
              })
            })
          })
        })
      })
    })
  }).then(function() {
    output.success({data});
  })
};
getAvailableData.outputs = ['success', 'error'];
getAvailableData.async = true;

function setAvailableData({input, state}) {
  Object.keys(input.data).forEach(function(crop) {
    state.set(['app', 'model', 'yield_data_index', crop], input.data[crop]);
  })
};

function showDomainModal({state}) {
  state.set(['app', 'view', 'domain_modal', 'visible'], true);
};

function hideDomainModal({state}) {
  state.set(['app', 'view', 'domain_modal', 'visible'], false);
};

function setDomainText({input, state}) {
  state.set(['app', 'view', 'domain_modal', 'text'], input.value)
};

function getOadaDomain({state, output}) {
  //First, check if the domain is already in the cache;
  var db = new PouchDB('TrialsTracker');
  db.get('domain').then(function(result) {
    if (result.doc.domain.indexOf('offline') > 0) {
      console.log('offline');
      output.offline({}); //In cache, but not connected to server for now
    } else {
      output.cached({value: result.doc.domain});//In cache, use it. 
    }
  }).catch(function(err) {
    if (err.status !== 404) throw err;
    console.log('fail');
    output.fail({});//Don't have it yet, prompt for it. 
  })
};
getOadaDomain.outputs = ['cached', 'offline', 'fail'];
getOadaDomain.async = true;



function setOadaDomain({input, state}) {
  state.set(['app', 'model', 'domain'], input.value);
  var db = new PouchDB('TrialsTracker');
  db.put({
    doc: {domain: input.value},
    _id: 'domain',
  }).catch(function(err) {
    if (err.status !== 409) throw err;
  })
};

function destroyCache() {
  var db = new PouchDB('TrialsTracker');
  db.destroy();
};

function exitEditMode({state}) {
  state.set(['app', 'view', 'editing_note'], false);
};

function enterEditMode({state}) {
  state.set(['app', 'view', 'editing_note'], true);
};

function registerGeohashes({input, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later with filterGeohashesOnScreen when the list of available
// geohashes becomes known.
  input.geohashes.forEach((geohash) => {
    state.set(['app', 'model', 'geohashes_on_screen', input.crop], geohash)
  })
}

function unregisterGeohashes({input, state}) {
  input.geohashesToRemove.forEach((geohash) => {
    state.unset(['app', 'model', 'geohashes_on_screen', geohash]);
  });
};

function setNewData({input, state}) {
  console.log('setting new data value');
  state.set(['app', 'dummy_value'], input.value+1);
};

function sendNewData({state, output}) {
  var token = state.get(['app', 'token']);
  console.log('sending new data');
  var value = state.get(['app', 'dummy_value']);
  var domain = state.get(['model', 'domain']);
  var url = 'https://' + domain + '/bookmarks/harvest/tiled-maps/crop-index/';
  return agent('PUT', url+'dp68rsz/data/bd82151e-462c-4631-9b18-8024a8aa2d5f/')
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
  var db = new PouchDB('TrialsTracker');
  var token = state.get(['app', 'token']);
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
      var domain = state.get(['model', 'domain']);
      var url = 'https://' + domain + '/bookmarks/harvest/tiled-maps/crop-index/';
      return agent('GET', url+key)
      .set('Authorization', 'Bearer '+ token)
      .end()
      .then(function(response) {
        console.log('setting state');
        state.set(['app', 'model', 'current_geohashes', key], response.body._rev);
        db.put({jsonData: response.body}, key).catch(function(err) {
          if (err.status !== 409) throw err;
        });
      });   
    }
  });
};

function setDrawMode({input, state}) {
  state.set(['app', 'view', 'draw_mode'], input.drawMode); 
};

function getToken({input, state, output}) {
  var self = this;
  var db = new PouchDB('TrialsTracker');
  db.get('token').then(function(result) {
    output.success({token:result.doc.token});
  }).catch(function(err) { //not in Pouch, prompt for user sign in
    if (err.status !== 404) console.log(err);
    var options = {
      metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vdHJpYWxzdHJhY2tlci5vYWRhLWRldi5jb20vb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJUcmlhbHMgVHJhY2tlciIsImNsaWVudF91cmkiOiJodHRwczovL2dpdGh1Yi5jb20vT3BlbkFUSy9UcmlhbHNUcmFja2VyIiwiY29udGFjdHMiOlsiU2FtIE5vZWwgPHNhbm9lbEBwdXJkdWUuZWR1PiJdLCJzb2Z0d2FyZV9pZCI6IjVjYzY1YjIwLTUzYzAtNDJmMS05NjRlLWEyNTgxODA5MzM0NCIsInJlZ2lzdHJhdGlvbl9wcm92aWRlciI6Imh0dHBzOi8vaWRlbnRpdHkub2FkYS1kZXYuY29tIiwiaWF0IjoxNDc1NjA5NTkwfQ.Qsve_NiyQHGf_PclMArHEnBuVyCWvH9X7awLkO1rT-4Sfdoq0zV_ZhYlvI4QAyYSWF_dqMyiYYokeZoQ0sJGK7ZneFwRFXrVFCoRjwXLgHKaJ0QfV9Viaz3cVo3I4xyzbY4SjKizuI3cwfqFylwqfVrffHjuKR4zEmW6bNT5irI',
      scope: 'yield-data field-notes field-boundaries',
//      params: {
//        "redirect_uri": 'https://trialstracker.oada-dev.com/oauth2/redirect.html', 
        "redirect": 'http://localhost:8000/oauth2/redirect.html',
//      }
    };
    var domain = state.get(['app', 'model', 'domain']);
    oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
      if (err) { console.dir(err); output.error(); } // Something went wrong  
      output.success({token:accessToken.access_token});
    });
  })
};
getToken.outputs = ['success', 'error'];
getToken.async = true;

function storeToken({input, state}) {
  var db = new PouchDB('TrialsTracker');
  db.put({
    doc: {token: input.token},
    _id: 'token',
  }).catch(function(err) {
    if (err.status !== 409) throw err;
  });
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

function setTagText ({input, state}) {
  state.set(['app', 'model', 'tag_input_text'], input.value);
};

function clearTagText ({input, state}) {
  state.set(['app', 'model', 'tag_input_text'], '');
};

function setNoteText ({input, state}) {
  state.set(['app', 'model', 'notes', input.noteId, 'text'], input.value);
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
  }
};

function deselectNote ({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'model', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);
};

function deselectReselectNote({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'model', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);

  //Now select the new note
  state.set(['app', 'model', 'selected_note'], input.note);
}

function createNote({input, state}) {
  var note = state.get(['app', 'model', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'model', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);

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
    color: rmc.getColor(),
    completions: [],
    selected: true,
    stats: {},
  };
  newNote.font_color = getFontColor(newNote.color);
  state.set(['app', 'model', 'notes', newNote.id], newNote);

  //Now select the new note
  state.set(['app', 'model', 'selected_note'], newNote.id);
};

function getFontColor(color) {
  var L = Color(color).luminosity();
  if (L > 0.179) {
    return '#000000';
  } else {
    return '#ffffff';
  }
}

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
