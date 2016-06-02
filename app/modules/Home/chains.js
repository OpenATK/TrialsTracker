import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import bair from './Bair100.js';
import _ from 'lodash';
import md5 from 'md5';
import PouchDB from 'pouchdb';
import oadaIdClient from 'oada-id-client';

getAccessToken.outputs = ['success', 'error'];

export var initialize = [
  getAccessToken, {
    success: [storeToken],
    error: []
  },
  initPouch, 
];

export var changeSortMode = [
  setSortMode
];

export var removeNote = [
  unselectIfSelected, checkTags, deleteNote, 
];

export var textInputChanged = [
  setTextInputValue
];

export var selectNote = [
 // unselectNote, selectNewNote, updateTagsList,
];

export var clickedShowHideButton = [
];

export var addNewNote = [
  unselectNote, createNewNote
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
  storeMd5, storeData,
];

function initPouch({input, state}) {
//  this._db = new PouchDB('yield-data');
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
    console.log('got a token');
    output.success({token:accessToken});
  });
};


function storeMd5({input, state}) {
  var allData = state.get([ 'home', 'yield' ]);
  if (!_.includes(allData, input.data)) {
    state.push([ 'home', 'yield' ], md5(JSON.stringify(input.data)));
  }
};

function storeData({input, state}) {
  console.log(this);
  if (!err) { 
    var img = input.context.getImageData(0,0,256,256);
    var data = img.data;

    for (var j = 0; j < img.height; j++) {
      for (var i = 0; i < img.width; i++) {
        //TODO: Compute Color
//        var color = getColor;
        data[((j*256+i)*4)]   = 0; // red
        data[((j*256+i)*4)+1] = 0; // green
        data[((j*256+i)*4)+2] = 0; // blue
        data[((j*256+i)*4)+3] = 128; // alpha
      }
    } 
    input.context.putImageData(img, 0, 0);
    input.context.drawImage(input.canvas, 0, 0); 
  }
  var doc = {data: input.data, imageData: data};
  //TODO: after I get data in oada, get the geohash-7 as the ID
  var docId = input.data.geohash7;
  this._db.put(doc, docId);
};

function getCanvas({input, state}) {

};

function storeToken({input, state}) {
  console.log('auth info stored');
  state.set(['home', 'token'], input.token);
};

function getData ({input, state}) {
  var bounds = input.bounds;
  var geohashesNeeded = gh.bboxes(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast(), 7);
//  var data = request
//    .get('localhost:3000/bookmarks/')
//    .auth(state.get(['home', 'user']), state.get(['home', 'token']))
//    .end();
  var yieldData = [];
  for (var g = 0; g < geohashesNeeded.length; g++) {
    if (bair[geohashesNeeded[g]]) {
      var data = bair[geohashesNeeded[g]].data;
      _.each(data, function (value, key) {
        if (value.location) {
          yieldData.push({
            lat: value.location.lat,
            lon: value.location.lon,
            val: value.value,
          });
        }
      });
    }
  }
  state.set(['home', 'yield'], yieldData);
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
  
  };

function selectNewNote ({input, state}) {
  if (state.get(['home', 'model', 'selected_note']) == input.newSelectedNote) {
  } else {
    if (!_.isEmpty(state.get(['home', 'model', 'selected_note']))) {
      state.set(['home', 'model', 'notes', state.get(['home', 'model', 'selected_note']), 'selected'], false);
    }
    state.set(['home', 'model', 'selected_note'], {});

    state.set(['home', 'model', 'selected_note'], input.newSelectedNote);
    state.set(['home', 'model', 'notes', input.newSelectedNote, 'selected'], true);

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

function createNewNote({state}) {
  var newNote = {
    text: '',
    tags: [],
    fields: [],
    geojson: { "type":"Polygon",
      "coordinates": [
        []
      ]
     },
     geojson_visible: 'Show',
     color: getColor(),
     completions: [],
     selected: true,
     id: uuid.v4(),
  };
  state.set(['home', 'model', 'notes', newNote.id], newNote);
};

function getColor() {
  var r = (Math.round(Math.random()*127) + 127).toString(16);
  var g = (Math.round(Math.random()*127) + 127).toString(16);
  var b = (Math.round(Math.random()*127) + 127).toString(16);
  return '#' + r.toString() + g.toString() + b.toString();
}
