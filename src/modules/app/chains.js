import {set, unset, copy, toggle } from 'cerebral/operators';
import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import oadaIdClient from 'oada-id-client';
import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
import gju from 'geojson-utils';
import PouchDB from 'pouchdb';
import cache from '../Cache/cache.js';
import rmc from 'random-material-color';
import Color from 'color';
import gjArea from 'geojson-area';
import computeBoundingBox from './utils/computeBoundingBox.js';
import polygonsIntersect from './utils/polygonsIntersect.js';
import yieldDataStatsForPolygon from './actions/yieldDataStatsForPolygon.js';
import getFieldDataForNotes from './actions/getFieldDataForNotes.js';

var drawFirstGeohashes = [
  getToken, {
    success: [
      storeToken, 
      getFields, {
        success: [
          setFields, 
          computeFieldBoundingBoxes, {
            success: [setFieldBoundingBoxes],
            error: [],
          }
        ],
        error: [],
      }, 
      getAvailableYieldData, {
        success: [
          setAvailableData,
          computeFieldStats, {
            success: [
              setFieldStats,
              getFieldDataForNotes,
            ],
            error: [],
          }  
        ],
        error: [],
      }
    ], 
    error: [],
  },
];

export var initialize = [
  getOadaDomain, {
    cached: [
      setOadaDomain, 
      set('state:app.view.domain_modal.visible', false),
      drawFirstGeohashes
    ],
    offline: [],
    fail: [set('state:app.view.domain_modal.visible', true)],
  },
];

export var addTag = [
  addTagToNote, addTagToAllTagsList, 
  set('state:app.model.tag_input_text', ''),
];

export var removeTag = [
  removeTagFromNote, removeTagFromAllTagsList,
];

export var handleNoteListClick = [
  deselectNote, 
  set('state:app.view.editing_note', false),
];

export var enterNoteEditMode = [
  set('state:app.view.editing_note', true),
  set('state:app.view.map.drawing_note_polygon', true),
  set('state:app.view.map.drawing_note_polygon', true),
];

export var exitNoteEditMode = [
  set('state:app.view.editing_note', false),
];

export var changeSortMode = [
  set('state:app.view.sort_mode', 'input.newSortMode'),
];

export var handleNoteClick = [
  deselectNote, 
  set('state:app.view.editing_note', false),
  selectNote, 
  mapToNotePolygon
];

export var removeNote = [
 set('state:app.view.map.drawing_note_polygon', false), 
 deselectNote,
 checkTags, 
 deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
  set('state:app.model.tag_input_text', 'input.value'),
];

export var addNewNote = [
  createNote, 
  set('state:app.view.map.drawing_note_polygon', true), 
  set('state:app.view.editing_note', true),
];

export var changeShowHideState = [
  changeShowHide, 
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
  set('state:app.view.domain_modal.text', 'input.value')
];

export var submitDomainModal = [
  setOadaDomain, 
  set('state:app.view.domain_modal.visible', false),
  drawFirstGeohashes,
];

export var cancelDomainModal = [
  setOadaDomain,
  set('state:app.view.domain_modal.visible', false),
]

export var displayDomainModal = [
  set('state:app.view.domain_modal.visible', true),
]

export var toggleCropLayerVisibility = [
  toggleCropLayer,
]

export var toggleCropDropdownVisibility = [
  toggleCropDropdown,
]

export var handleLocationFound = [
  setCurrentLocation,
]

export var handleCurrentLocationButton = [
  setMapToCurrentLocation,
]

export var handleMapMoved = [
  setMapLocation,
]

function computeFieldBoundingBoxes({input, state, output}) {
  var bboxes = {};
  var areas = {};
  Object.keys(input.fields).forEach((field) => {
    bboxes[field] = computeBoundingBox(input.fields[field].boundary.geojson);
    areas[field] = gjArea.geometry(input.fields[field].boundary.geojson)/4046.86;
  })
  output.success({bboxes, areas})
}
computeFieldBoundingBoxes.async = true;
computeFieldBoundingBoxes.outputs = ['success', 'error'];

function setFieldBoundingBoxes({input, state}) {
  Object.keys(input.bboxes).forEach((field) => {
    state.set(['app', 'model', 'fields', field, 'boundary', 'area'], input.areas[field]);
    state.set(['app', 'model', 'fields', field, 'boundary', 'bbox'], input.bboxes[field]);
  })
}

function computeFieldStats({input, state, output}) {
  var token = state.get(['app', 'view', 'server', 'token']);
  var domain = state.get(['app', 'view', 'server', 'domain']);
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var stats = {};
  Promise.map(Object.keys(input.fields), function(field) {
    return yieldDataStatsForPolygon(input.fields[field].boundary.geojson.coordinates[0], input.bboxes[field], availableGeohashes, baseUrl, token)
    .then((fieldStats) => {
      stats[field] = fieldStats;
      return stats;
    })
  }).then(() => { 
    var ids = Object.keys(state.get(['app', 'model', 'notes']));
    output.success({stats, ids});
  })
}
computeFieldStats.outputs = ['success', 'error'];
computeFieldStats.async = true;

function setFieldStats({input, state}) {
  Object.keys(input.stats).forEach((field) => {
    Object.keys(input.stats[field]).forEach((crop) => {
      if (isNaN(input.stats[field][crop].mean_yield)) {
        state.unset(['app', 'model', 'fields', field, 'stats', crop]);
      } else {
        state.set(['app', 'model', 'fields', field, 'stats', crop], input.stats[field][crop]);
      }
    })
    state.unset(['app', 'model', 'fields', field, 'stats', 'computing']);
  })
}

function setNoteFields({input, state}) {
  var notes = state.get(['app', 'model', 'notes']);
  var fields = state.get(['app', 'model', 'fields']);
  Object.keys(notes).forEach((note) => {
    Object.keys(fields).forEach((field) => {
      if (notes[note].geometry.geojson.coordinates[0].length > 3) {
        if (polygonsIntersect(fields[field].boundary.geojson.coordinates[0], notes[note].geometry.geojson.coordinates[0])) {
          //get the field average for each crop and compare to note average
          var obj = {};
          Object.keys(fields[field].stats).forEach((crop) => {
            if (notes[note].stats[crop]) {
              obj[crop] = {
                difference: notes[note].stats[crop].mean_yield - fields[field].stats[crop].mean_yield
              }
            }
          })
          state.set(['app', 'model', 'notes', note, 'fields', field], obj);
        }
      }
    })
  })
}

function mapToNotePolygon({input, state}) {
  var note = state.get(['app', 'model', 'notes', input.note]);
  state.set(['app', 'view', 'map', 'map_location'], note.geometry.centroid);
}

function setMapLocation({input, state}) {
  state.set(['app', 'view', 'map', 'map_location'], [input.latlng.lat, input.latlng.lng]);
  state.set(['app', 'view', 'map', 'map_zoom'], input.zoom);
}

function setMapToCurrentLocation({input, state}) {
  console.log(input);
  var loc = state.get(['app', 'view', 'current_location']);
  state.set(['app', 'view', 'map', 'map_location'], loc);
}

function getFields({state, output}) {
  var token = state.get(['app', 'view', 'server', 'token']);
  var domain = state.get(['app', 'view', 'server', 'domain']);
  var url = 'https://' + domain + '/bookmarks/fields/fields-index/';
  var fields = {};
  cache.get(url, token).then(function(fieldsIndex) {
    return Promise.each(Object.keys(fieldsIndex), function(item) {
      return cache.get(url + item, token).then(function(fieldItem) {
        if (fieldItem['fields-index']) {
          return cache.get(url + item + '/fields-index/', token).then(function(fieldKeys) {
            return Promise.each(Object.keys(fieldKeys), function(key) {
              return cache.get(url + item + '/fields-index/'+key, token).then(function(field) {
                return fields[key] = field;
              })
            })
          })
        } else {
          return cache.get(url + item, token).then(function(field) {
            return fields[item] = field;
          })
        }
      })
    })
  }).then(function() {
    output.success({fields});
  })
}
getFields.outputs = ['success', 'error'];
getFields.async = true;

function setFields({input, state}) {
  Object.keys(input.fields).forEach(function(field) {
    state.set(['app', 'model', 'fields', field], input.fields[field]);
  })
}

function setCurrentLocation({input, state}) {
  var obj = {
    lat: input.lat,
    lng: input.lng,
  }
  state.set(['app', 'model', 'current_location'], obj);
}

function toggleCropDropdown({input, state}) {
  var vis = state.get(['app', 'view', 'crop_dropdown_visible']);
  state.set(['app', 'view', 'crop_dropdown_visible'], !vis);
}

function toggleCropLayer({input, state}) {
  var vis = state.get(['app', 'view', 'map', 'crop_layers', input.crop, 'visible']);
  state.set(['app', 'view', 'map', 'crop_layers', input.crop, 'visible'], !vis);
}

function getAvailableYieldData({state, output}) {
  var token = state.get(['app', 'view', 'server', 'token']);
  var domain = state.get(['app', 'view', 'server', 'domain']);
  var url = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var data = {};
  var cropStatus = {};
  cache.get(url, token).then(function(crops) {
    return Promise.each(Object.keys(crops), function(crop) {
      data[crop] = {};
      return cache.get(url + crop + '/geohash-length-index', token).then(function(geohashLengthIndex) {
        return Promise.each(Object.keys(geohashLengthIndex), function(ghLength) {
          data[crop][ghLength] = data[crop][ghLength] || {};
          return cache.get(url + crop + '/geohash-length-index/' + ghLength + '/geohash-index', token).then(function(ghIndex) {
            return Promise.each(Object.keys(ghIndex), function(bucket) {
              return data[crop][ghLength][bucket] = bucket;
            })
          })
        })
      })
    })
  }).then(function() {
    output.success({data, cropStatus});
  })
}
getAvailableYieldData.outputs = ['success', 'error'];
getAvailableYieldData.async = true;

function setAvailableData({input, state}) {
  Object.keys(input.data).forEach(function(crop) {
    state.set(['app', 'view', 'map', 'crop_layers', crop, 'visible'], true);
    Object.keys(input.data[crop]).forEach(function(ghLength) {
      state.set(['app', 'model', 'yield_data_index', crop, ghLength], input.data[crop][ghLength]);
    })
  })
}

function getOadaDomain({state, output}) {
  //First, check if the domain is already in the cache;
  var db = new PouchDB('TrialsTracker');
  db.get('domain').then(function(result) {
    if (result.doc.domain.indexOf('offline') > 0) {
      output.offline({}); //In cache, but not connected to server for now
    } else {
      output.cached({value: result.doc.domain});//In cache, use it. 
    }
  }).catch(function(err) {
    if (err.status !== 404) throw err;
    output.fail({});//Don't have it yet, prompt for it. 
  })
};
getOadaDomain.outputs = ['cached', 'offline', 'fail'];
getOadaDomain.async = true;

function setOadaDomain({input, state}) {
  state.set(['app', 'view', 'server', 'domain'], input.value);
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

function registerGeohashes({input, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later with filterGeohashesOnScreen when the list of available
// geohashes becomes known.
  input.geohashes.forEach((geohash) => {
    state.set(['app', 'view', 'map', 'geohashes_on_screen', input.layer], geohash)
  })
}

function unregisterGeohashes({input, state}) {
  input.geohashesToRemove.forEach((geohash) => {
    state.unset(['app', 'model', 'geohashes_on_screen', geohash]);
  });
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
//        "redirect_uri": 'http://10.186.153.189:8000/oauth2/redirect.html', 
        "redirect": 'http://localhost:8000/oauth2/redirect.html',
//      }
    }
    var domain = state.get(['app', 'view', 'server', 'domain']);
    oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
      if (err) { console.dir(err); output.error(); } // Something went wrong  
      output.success({token:accessToken.access_token});
    })
  })
}
getToken.outputs = ['success', 'error'];
getToken.async = true;

function storeToken({input, state, services}) {
  var db = new PouchDB('TrialsTracker');
  db.put({
    doc: {token: input.token},
    _id: 'token',
  }).catch(function(err) {
    if (err.status !== 409) throw err;
  });
  state.set(['app', 'view', 'server', 'token'], input.token);
  state.set('app.view.server.offline', false);
};

function changeShowHide ({input, state}) {
  var geometryVisible = state.get(['app', 'model', 'notes', input.id, 'geometry', 'visible']);
  if (geometryVisible) {
    state.set(['app', 'model', 'notes', input.id, 'geometry', 'visible'], false);
  } else {
    state.set(['app', 'model', 'notes', input.id, 'geometry', 'visible'], true);
  }
};

function setNoteText ({input, state}) {
  state.set(['app', 'model', 'notes', input.noteId, 'text'], input.value);
};

function selectNote ({input, state}) {
  //check that the selected note isn't already selected
  if (state.get(['app', 'view', 'selected_note']) !== input.note) {
    // set the status of the currently selected note to "unselected"
    if (!_.isEmpty(state.get(['app', 'view', 'selected_note']))) {
      state.set(['app', 'model', 'notes', state.get(['app', 'view', 'selected_note']), 'selected'], false);
    }
    state.set(['app', 'view', 'selected_note'], input.note);
    state.set(['app', 'model', 'notes', input.note, 'selected'], true);
  }
};

function deselectNote ({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  if (!_.isEmpty(note)) state.set(['app', 'model', 'notes', note, 'selected'], false);
  state.set(['app', 'view', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);
};

function createNote({input, state}) {
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    state.set(['app', 'model', 'notes', note, 'order'], notes[note].order +1);
  })
  var note = state.get(['app', 'view', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'view', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);

  var newNote = {
    time: Date.now(),
    id: uuid.v4(),
    text: '',
    tags: [],
    fields: {},
    geometry: { 
      geojson: {
        "type":"Polygon",
        "coordinates": [[]],
      },
      bbox: {},
      centroid: [],
      visible: true,
    },
    color: rmc.getColor(),
    completions: [],
    selected: true,
    stats: {},
    order: 1,
  };

  newNote.font_color = getFontColor(newNote.color);
  state.set(['app', 'model', 'notes', newNote.id], newNote);

  //Now select the new note
  state.set(['app', 'view', 'selected_note'], newNote.id);
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
  var allTags = state.get(['app', 'model', 'tags']);
  var noteTags = state.get(['app', 'model', 'notes', input.id, 'tags']);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  })
}

function deleteNote({input, state}) {
  state.unset(['app', 'model', 'notes', input.id]); 
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    if (notes[note].order > input.note) {
      state.set(['app', 'model', 'notes', note, 'order'], notes[note].order);
    }
  })
};

function addTagToNote({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  state.concat(['app', 'model', 'notes', note, 'tags'], input.text);
};

function removeTagFromNote({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
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
