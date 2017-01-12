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
import gjArea from '@mapbox/geojson-area';
import wellknown from 'wellknown';
import computeBoundingBox from './utils/computeBoundingBox.js';
import polygonsIntersect from './utils/polygonsIntersect.js';
import {getGrower} from './utils/datasilo.js';
import yieldDataStatsForPolygon from './actions/yieldDataStatsForPolygon.js';
import getFieldDataForNotes from './actions/getFieldDataForNotes.js';
import putInPouch from './factories/putInPouch';
import getFromPouch from './factories/getFromPouch';

var computeFieldYieldData = [
  computeFieldStats, {
    success: [
      setFieldStats,
      getFieldDataForNotes,
    ],
    error: [],
  },
];

var handleFields = [
  computeFieldBoundingBoxes, {
    success: [setFieldBoundingBoxes, computeFieldYieldData],
    error: [],
  },
]
        

var getFieldBoundaries = [
  handleFieldsSource, {
    oada: [
      getFieldsFromOada, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    data_silo: [
      getFieldsFromDatasilo, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    none: [],
    error: [],
  },
];

var getOadaYieldData = [
  getFromPouch('app.settings.data_sources.yield.oada_token'), {
    success: [
      copy('input:result.doc.val', 'state:app.settings.data_sources.yield.oada_token'),
      testOadaConnection, {
        success: [
          getYieldDataIndexFromOada, {
            success: [setYieldDataIndex, computeFieldYieldData],
            error: [],
          },
        ],
        error: [
          copy('state:app.settings.data_sources.yield.oada_domain', 'output:domain'),
          getOadaToken, {
            success: [
              copy('input:token', 'state:app.settings.data_sources.yield.oada_token'),
              putInPouch('app.settings.data_sources.yield.oada_token'),
              getYieldDataIndexFromOada, {
                success: [setYieldDataIndex, computeFieldYieldData],
                error: [],
              },
            ],
            error: [],
          },
        ],
      },
    ],
    error: [
      getOadaToken, {
        success: [
          copy('input:token', 'state:app.settings.data_sources.yield.oada_token'),
          putInPouch('app.settings.data_sources.yield.oada_token'),
          getYieldDataIndexFromOada, {
            success: [setYieldDataIndex, computeFieldYieldData],
            error: [],
          },
        ],
        error: [],
      },
    ],
  },
]

export var initialize = [
  getFromPouch('app.settings.data_sources.yield.source'), {
    success: [  
      copy('input:result.doc.val', 'app.settings.data_sources.yield.source'), 
      copy('input:result.doc.val', 'app.view.settings.data_sources.yield.source'), 
// handle different yield sources, and break this out into seperate function      handleYieldDataSource,
      getFromPouch('app.settings.data_sources.yield.oada_domain'), {
        success: [
          copy('input:result.doc.val', 'state:app.settings.data_sources.yield.oada_domain'),
          copy('input:result.doc.val', 'state:app.view.settings.data_sources.yield.oada_domain'),
          getOadaYieldData,
        ],
        error: [set('state:app.view.settings.data_sources.visible', true)],
      },
    ],
    error: [
      set('state:app.view.settings.data_sources.yield.oada_domain', 'yield.oada-dev.com'),
      set('state:app.view.settings.data_sources.yield.source', 'oada'),
      set('state:app.view.settings.data_sources.visible', true),
    ],
  },
  getFromPouch('app.settings.data_sources.fields.source'), {
    success: [
      copy('input:result.doc.val', 'state:app.settings.data_sources.fields.source'),
      copy('input:result.doc.val', 'state:app.view.settings.data_sources.fields.source'),
      getFromPouch('app.settings.data_sources.fields.oada_domain'), {
        success: [
          copy('input:result.doc.val', 'state:app.settings.data_sources.fields.oada_domain'),
          copy('input:result.doc.val', 'state:app.view.settings.data_sources.fields.oada_domain'),
          getFieldBoundaries,
        ],
        error: [set('state:app.view.settings.data_sources.visible', true)],
      },
    ],
    error: [
      set('state:app.view.settings.data_sources.fields.oada_domain', 'yield.oada-dev.com'),
      set('state:app.view.settings.data_sources.fields.source', 'oada'),
      set('state:app.view.settings.data_sources.visible', true),
    ],
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
  copy('input:newSortMode', 'state:app.view.sort_mode'),
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
  copy('input:value', 'state:app.model.tag_input_text'),
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

export var updateOadaYieldDomain = [
  copy('input:value', 'state:app.view.settings.data_sources.yield.oada_domain'),
];

export var updateOadaFieldsDomain = [
  copy('input:value', 'state:app.view.settings.data_sources.fields.oada_domain'),
];

export var submitDataSourceSettings = [
  set('state:app.view.settings.data_sources.visible', false),
  getNewYieldSource, {
    oada: [
      copy('state:app.view.settings.data_sources.yield.oada_domain', 'state:app.settings.data_sources.yield.oada_domain'),
      putInPouch('app.settings.data_sources.yield.oada_domain'),
      copy('state:app.view.settings.data_sources.yield.source', 'state:app.settings.data_sources.yield.source'),
      putInPouch('app.settings.data_sources.yield.source'),
      set('state:app.model.yield_data_index', {}),
      set('state:app.model.noteFields', {}),
      getOadaYieldData,
    ],
    none: [
      copy('state:app.view.settings.data_sources.yield.oada_domain', 'state:app.settings.data_sources.yield.oada_domain'),
      putInPouch('app.settings.data_sources.yield.oada_domain'), 
      copy('state:app.view.settings.data_sources.yield.source', 'state:app.settings.data_sources.yield.source'),
      putInPouch('app.settings.data_sources.yield.source'),
      set('state:app.model.yield_data_index', {}),
      set('state:app.model.noteFields', {}),
    ],
    no_change: [],
    error: [], //not really an error; data source didn't change.
  },
  getNewFieldsSource, {
    oada: [
      copy('state:app.view.settings.data_sources.fields.oada_domain', 'state:app.settings.data_sources.fields.oada_domain'),
      putInPouch('app.settings.data_sources.fields.oada_domain'),
      copy('state:app.view.settings.data_sources.fields.source', 'state:app.settings.data_sources.fields.source'),
      putInPouch('app.settings.data_sources.fields.source'),
      set('state:app.model.fields', {}),
      set('state:app.model.noteFields', {}),
      getFieldsFromOada, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    data_silo: [
      copy('state:app.view.settings.data_sources.fields.source', 'state:app.settings.data_sources.fields.source'),
      putInPouch('app.settings.data_sources.fields.source'),
      set('state:app.model.fields', {}),
      set('state:app.model.noteFields', {}),
      getFieldsFromDatasilo, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    none: [
      copy('state:app.view.settings.data_sources.fields.source', 'state:app.settings.data_sources.fields.source'),
      putInPouch('app.settings.data_sources.fields.source'),
      set('state:app.model.fields', {}),
      set('state:app.model.noteFields', {}),
    ],
    no_change: [],
    error: [], //not really an error; data source didn't change.
  },
];

export var cancelDataSourceSettings = [
  set('state:app.view.settings.data_sources.visible', false),
  copy('state:app.settings.data_sources.yield.oada_domain', 'state:app.view.settings.data_sources.yield.oada_domain'),
  copy('state:app.settings.data_sources.fields.source', 'state:app.view.settings.data_sources.fields.source'),
]

export var displayDataSourceSettings = [
  set('state:app.view.settings.data_sources.visible', true),
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

export var setYieldSource = [
  copy('input:value', 'state:app.view.settings.data_sources.yield.source') 
]

export var setFieldsSource = [
  copy('input:value', 'state:app.view.settings.data_sources.fields.source') 
]

function getNewFieldsSource({state, output}) {
  var currentSource = state.get('app.settings.data_sources.fields.source');
  var newSource = state.get('app.view.settings.data_sources.fields.source');
  if (currentSource !== newSource) {
    switch (newSource) { 
      case 'oada': 
        output.oada({});
        break;
      case 'none': 
        output.none({});
        break;
      case 'data_silo': 
        output.data_silo({});
        break;
      default: 
        output.error({});
    }
  }
  if (currentSource === 'oada') {
    var currentDomain = state.get('app.settings.data_sources.fields.oada_domain');
    var newDomain = state.get('app.view.settings.data_sources.fields.oada_domain');
    if (currentDomain !== newDomain) {
      output.oada({});
    }
  }
  output.no_change({});
}
getNewFieldsSource.async = true;
getNewFieldsSource.outputs = ['oada', 'data_silo', 'none', 'no_change', 'error'];

function getNewYieldSource({state, output}) {
  var currentSource = state.get('app.settings.data_sources.yield.source');
  var newSource = state.get('app.view.settings.data_sources.yield.source');
  if (currentSource !== newSource) {
    switch (newSource) { 
      case 'oada': 
        output.oada({});
        break;
      case 'none': 
        output.none({});
        break;
      default: 
        output.error({});
    }
  }
  if (currentSource === 'oada') {
    var currentDomain = state.get('app.settings.data_sources.yield.oada_domain');
    var newDomain = state.get('app.view.settings.data_sources.yield.oada_domain');
    if (currentDomain !== newDomain) {
      output.oada({});
    }
  }
  output.no_change({});
}
getNewYieldSource.async = true;
getNewYieldSource.outputs = ['oada', 'none', 'no_change', 'error'];

function handleYieldSource({state, output}) {
  var yieldSource = state.get('app.settings.data_sources.yield.source');
  if (yieldSource) {
    switch(yieldSource) {
      case 'oada': 
        output.oada({});
        break;
      case 'none': 
        output.none({});
        break;
      default: 
        output.error({});
    }
  }
  output.error({});
}
handleYieldSource.outputs = ['oada', 'none', 'error'];
handleYieldSource.async = true;

function handleFieldsSource({state, output}) {
  var fieldsSource = state.get('app.settings.data_sources.fields.source');
  if (fieldsSource) {
    switch(fieldsSource) {
      case 'oada': 
        output.oada({});
        break;
      case 'data_silo': 
        output.data_silo({});
        break;
      case 'none': 
        output.none({});
        break;
      default: 
        output.error({});
    }
  }
  output.error({});
}
handleFieldsSource.outputs = ['oada', 'data_silo', 'none', 'error'];
handleFieldsSource.async = true;


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
//TODO: need to check for valid data source
  Object.keys(input.bboxes).forEach((field) => {
    state.set(['app', 'model', 'fields', field, 'boundary', 'area'], input.areas[field]);
    state.set(['app', 'model', 'fields', field, 'boundary', 'bbox'], input.bboxes[field]);
  })
}

function computeFieldStats({input, state, output}) {
  var fields = state.get(['app', 'model', 'fields']);
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  if (!(fields && availableGeohashes)) output.error({});

  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var stats = {};
  Promise.map(Object.keys(fields), function(field) {
    return yieldDataStatsForPolygon(fields[field].boundary.geojson.coordinates[0], fields[field].boundary.bbox, availableGeohashes, baseUrl, token)
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
//TODO: need to check for NPE
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
//TODO: need to check for NPE
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
          state.set(['app', 'model', 'noteFields', note, field], obj);
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
  var loc = state.get(['app', 'model', 'current_location']);
  if (loc) state.set(['app', 'view', 'map', 'map_location'], [loc.lat, loc.lng]);
}

function getFieldsFromDatasilo({state, output}) {
  getGrower()
    .then(growers => {
      let oadaFields = {};

      growers.forEach(grower => {
        let farms = grower.farm || [];

        farms.forEach(farm => {
          let fields = farm.field || [];

          fields.forEach(field => {
            let seasons = field.season || [];

            seasons.forEach(season => {
              let name = `${field.name}-${season.season}`;

              oadaFields[name] = {
                _id: `winfield-${season.id}`,
                name: `${field.name}-${season.season}`,
                context: {
                  fields: 'fields-index',
                  'fields-index': name,
                  [farm.name]: 'fields-index'
                },
                boundary: {
                  geojson: wellknown(season.boundary)
                }
              };

            });
          });
        });
      });

      output.success({fields: oadaFields});
    })
    .catch(function(error) {
      output.error(error);
    })
}
getFieldsFromDatasilo.outputs = ['success', 'error'];
getFieldsFromDatasilo.async = true;

function getFieldsFromOada({state, output}) {
//  var token = state.get('app.settings.data_sources.yield.oada_token');
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
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
getFieldsFromOada.outputs = ['success', 'error'];
getFieldsFromOada.async = true;

function setFieldBoundaries({input, state}) {
  if (input.fields) {
    Object.keys(input.fields).forEach(function(field) {
      state.set(['app', 'model', 'fields', field], input.fields[field]);
    })
  }
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

function getYieldDataIndexFromOada({state, output}) {
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
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
getYieldDataIndexFromOada.outputs = ['success', 'error'];
getYieldDataIndexFromOada.async = true;

function setYieldDataIndex({input, state}) {
  if (input.data) {
    Object.keys(input.data).forEach(function(crop) {
      state.set(['app', 'view', 'map', 'crop_layers', crop, 'visible'], true);
      Object.keys(input.data[crop]).forEach(function(ghLength) {
        state.set(['app', 'model', 'yield_data_index', crop, ghLength], input.data[crop][ghLength]);
      })
    })
  }
}

function getOadaDomainFromPouch({state, output}) {
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
    output.error({});//Don't have it yet, prompt for it. 
  })
};
getOadaDomainFromPouch.outputs = ['cached', 'offline', 'error'];
getOadaDomainFromPouch.async = true;

function putOadaDomainInPouch({input, state}) {
  var val = state.get('app.settings.data_sources.yield.oada_domain');
  if (val.length > 0) {
    var db = new PouchDB('TrialsTracker');
    db.put({
      doc: {domain: val},
      _id: 'domain',
    }).catch(function(err) {
      if (err.status !== 409) throw err;
    })
  }
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

function testOadaConnection({state, output}) {
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var url = 'https://'+domain+'/bookmarks/';
  return agent('GET', url)
  .set('Authorization', 'Bearer '+ token)
  .end()
  .then(function(response) {
    output.success({});
  }).catch(function(err) {
    output.error({});
  })
}
testOadaConnection.async = true;
testOadaConnection.outputs = ['success', 'error'];

function getOadaToken({input, state, output}) {
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vdHJpYWxzdHJhY2tlci5vYWRhLWRldi5jb20vb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJUcmlhbHMgVHJhY2tlciIsImNsaWVudF91cmkiOiJodHRwczovL2dpdGh1Yi5jb20vT3BlbkFUSy9UcmlhbHNUcmFja2VyIiwiY29udGFjdHMiOlsiU2FtIE5vZWwgPHNhbm9lbEBwdXJkdWUuZWR1PiJdLCJzb2Z0d2FyZV9pZCI6IjVjYzY1YjIwLTUzYzAtNDJmMS05NjRlLWEyNTgxODA5MzM0NCIsInJlZ2lzdHJhdGlvbl9wcm92aWRlciI6Imh0dHBzOi8vaWRlbnRpdHkub2FkYS1kZXYuY29tIiwiaWF0IjoxNDc1NjA5NTkwfQ.Qsve_NiyQHGf_PclMArHEnBuVyCWvH9X7awLkO1rT-4Sfdoq0zV_ZhYlvI4QAyYSWF_dqMyiYYokeZoQ0sJGK7ZneFwRFXrVFCoRjwXLgHKaJ0QfV9Viaz3cVo3I4xyzbY4SjKizuI3cwfqFylwqfVrffHjuKR4zEmW6bNT5irI',
    scope: 'yield-data field-notes field-boundaries',
//      params: {
//        "redirect_uri": 'https://trialstracker.oada-dev.com/oauth2/redirect.html', 
//        "redirect_uri": 'http://10.186.153.189:8000/oauth2/redirect.html', 
      "redirect": 'http://localhost:8000/oauth2/redirect.html',
//      }
  }
  var domain = state.get('app.settings.data_sources.yield.oada_domain'); //TODO: don't hard code this as the source of the domain
  oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
    if (err) { console.dir(err); output.error(); } // Something went wrong  
    output.success({token:accessToken.access_token});
  })
}
getOadaToken.outputs = ['success', 'error'];
getOadaToken.async = true;

function storeToken({input, state, services}) {
  var db = new PouchDB('TrialsTracker');
  db.put({
    doc: {token: input.token},
    _id: 'token',
  }).catch(function(err) {
    if (err.status !== 409) throw err;
  });
  state.set('app.settings.data_sources.yield.oada_token', input.token);
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
  state.unset(['app', 'view', 'selected_note']);
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
