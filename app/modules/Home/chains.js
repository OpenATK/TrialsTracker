import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import bair from './Bair100.js';
import _ from 'lodash';
import md5 from 'md5';
import PouchDB from 'pouchdb';
import oadaIdClient from 'oada-id-client';
var agent = require('superagent-promise')(require('superagent'), Promise);

export var initialize = [
  getAccessToken, {
    success: [storeToken, [getAvailableGeohashes, {
      success: [storeAvailableGeohashes],
      error: [],
    }]],
    error: []
  }, 
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

export var getYieldData = [
  getData, 
];

export var handleRequestResponse = [
  storeRev,
];

function storeAvailableGeohashes({input, state}) {
  state.set(['home', 'model', 'availableGeohashes'], input.gh)
};

function getAvailableGeohashes({state,output}) {
  var token = state.get(['home', 'token']).access_token;
  return agent('GET', 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7')
    .set('Authorization', 'Bearer '+ token)
    .end()
    .then(function(response) {
      var gh = Object.keys(response.body).filter((key) => key[0] !== '_'); 
      output.success({gh});
   });
}

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

function storeRev({input, state}) {
  //TODO: figure out why geohash is undefined sometimes in the recievedRequestResponse signal in RasterLayer/index.js
  if (input.geohash) {
    state.set(['home', 'yield_revs', input.geohash], input.rev);
  }
};

function storeData({input, state}) {

};

function storeToken({input, state}) {
  state.set(['home', 'token'], input.token);
};

function getData ({input, state}) {
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
