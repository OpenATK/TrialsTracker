import { set, equals } from 'cerebral/operators';
import _ from 'lodash';
import oadaIdClient from 'oada-id-client';
import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
import cache from '../Cache';
import gjArea from '@mapbox/geojson-area';
import wellknown from 'wellknown';
import computeBoundingBox from '../Map/utils/computeBoundingBox.js';
import { getGrower } from '../Map/utils/datasilo.js';
import getFieldDataForNotes from '../Map/actions/getFieldDataForNotes.js';
import setFieldDataForNotes from '../Map/actions/setFieldDataForNotes.js';
import putInPouch from './factories/putInPouch';
import getFromPouch from './factories/getFromPouch';
import db from '../Pouch';
import MobileDetect from 'mobile-detect';
import computeFieldStats from './actions/computeFieldStats.js';
import {props, state } from 'cerebral/tags'
import {parallel} from 'cerebral'

var computeFieldYieldData = [
  computeFieldStats, {
    success: [
      setFieldStats,
      getFieldDataForNotes, {
        success: [setFieldDataForNotes],
        error: [],
      }
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
  equals('app.settings.data_sources.fields.source'), {
    oada: [
      getOadaTokenSequence, getFieldsFromOada, {
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
  },
];

var getOadaTokenSequence = [
  getFromPouch('app.settings.data_sources.yield.oada_token'), {
    success: [
      set(state`app.settings.data_sources.yield.oada_token`, props`result.doc.val`),
      testOadaConnection, {
        error: [
          set(state`app.settings.data_sources.yield.oada_domain`, `props:domain`),
          getOadaToken, {
            success: [
              set(state`app.settings.data_sources.yield.oada_token`, props`token`),
              putInPouch('app.settings.data_sources.yield.oada_token'),
            ],
          },
        ],
      },
    ],
    error: [
      getOadaToken, {
        success: [
          set(state`app.settings.data_sources.yield.oada_token`, props`token`),
          putInPouch('app.settings.data_sources.yield.oada_token'),
        ],
        error: [],
      },
    ],
  },
]

var getOadaYieldData = [
  getOadaTokenSequence, {
    success: [
      getYieldDataIndexFromOada, {
        success: [setYieldDataIndex, computeFieldYieldData],
        error: [],
      }
    ],
    error: [],
  }
]

export var getDataSources = parallel([
  getFromPouch('app.settings.data_sources.yield.source'), {
    success: [  
      set(state`app.settings.data_sources.yield.source`, props`result.doc.val`), 
      set(state`app.view.settings.data_sources.yield.source`, props`result.doc.val`), 
      getFromPouch('app.settings.data_sources.yield.oada_domain'), {
        success: [
          set(state`app.settings.data_sources.yield.oada_domain`, props`result.doc.val`),
          set(state`app.view.settings.data_sources.yield.oada_domain`, props`result.doc.val`),
        ],
        error: [set(state`app.view.settings.data_sources.visible`, true)],
      },
    ],
    error: [
      set(state`app.view.settings.data_sources.visible`, true),
    ],
  },
  getFromPouch('app.settings.data_sources.fields.source'), {
    success: [
      set(state`app.settings.data_sources.fields.source`, props`result.doc.val`),
      set(state`app.view.settings.data_sources.fields.source`, props`result.doc.val`),
      getFromPouch('app.settings.data_sources.fields.oada_domain'), {
        success: [
          set(state`app.settings.data_sources.fields.oada_domain`, props`result.doc.val`),
          set(state`app.view.settings.data_sources.fields.oada_domain`, props`result.doc.val`),
        ],
        error: [set(state`app.view.settings.data_sources.visible`, true)],
      },
    ],
    error: [
      set(state`app.view.settings.data_sources.visible`, true),
    ],
  },
])

export var initialize = [
  setMobile,
  getDataSources,
//  parallel([getOadaYieldData, getFieldBoundaries]), 
];

export var removeGeohashes = [
  unregisterGeohashes,
];

export var addGeohashes = [
  registerGeohashes,
];

export var clearCache = [
  destroyCache, {
    success: [],
    error: []
  },
];

export var updateOadaYieldDomain = [
  set(state`app.view.settings.data_sources.yield.oada_domain`, props`value`),
];

export var updateOadaFieldsDomain = [
  set(state`app.view.settings.data_sources.fields.oada_domain`, props`value`),
];

export var submitDataSourceSettings = [
  set(state`app.view.settings.data_sources.visible`, false),
  equals(state`app.view.settings.data_sources.yield.source`), {
    oada: [
      set(state`app.settings.data_sources.yield.oada_domain`, state`app.view.settings.data_sources.yield.oada_domain`),
      putInPouch(`app.settings.data_sources.yield.oada_domain`),
      set(state`app.settings.data_sources.yield.source`, state`app.view.settings.data_sources.yield.source`),
      putInPouch('app.settings.data_sources.yield.source'),
      set(state`app.model.yield_data_index`, {}),
      getOadaYieldData,
    ],
    none: [
      set(state`app.settings.data_sources.yield.oada_domain`, state`app.view.settings.data_sources.yield.oada_domain`),
      putInPouch('app.settings.data_sources.yield.oada_domain'), 
      set(state`app.settings.data_sources.yield.source`, state`app.view.settings.data_sources.yield.source`),
      putInPouch('app.settings.data_sources.yield.source'),
      set(state`app.model.yield_data_index`, {}),
    ],
    error: [], //not really an error; data source didn't change.
  },
  equals(state`app.view.settings.data_sources.fields.source`), {
    oada: [
      set(state`app.settings.data_sources.fields.oada_domain`, state`app.view.settings.data_sources.fields.oada_domain`),
      putInPouch('app.settings.data_sources.fields.oada_domain'),
      set(state`app.settings.data_sources.fields.source`, state`app.view.settings.data_sources.fields.source`),
      putInPouch('app.settings.data_sources.fields.source'),
      set(state`app.model.fields`, {}),
      getFieldsFromOada, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    data_silo: [
      set(state`app.settings.data_sources.fields.source`, state`app.view.settings.data_sources.fields.source`),
      putInPouch('app.settings.data_sources.fields.source'),
      set(state`app.model.fields`, {}),
      getFieldsFromDatasilo, {
        success: [setFieldBoundaries, handleFields],
        error: [],
      },
    ],
    none: [
      set(state`app.settings.data_sources.fields.source`, state`app.view.settings.data_sources.fields.source`),
      putInPouch('app.settings.data_sources.fields.source'),
      set(state`app.model.fields`, {}),
    ],
    error: [], //not really an error; data source didn't change.
  },
];

export var cancelDataSourceSettings = [
  set(state`app.view.settings.data_sources.visible`, false),
  set(state`app.view.settings.data_sources.yield.oada_domain`, state`app.settings.data_sources.yield.oada_domain`),
  set(state`app.view.settings.data_sources.fields.source`, state`app.settings.data_sources.fields.source`),
]

export var displayDataSourceSettings = [
  set(state`app.view.settings.data_sources.visible`, true),
]

export var setYieldSource = [
  set(state`app.view.settings.data_sources.yield.source`, props`value`) 
]

export var setFieldsSource = [
  set(state`app.view.settings.data_sources.fields.source`, props`value`) 
]

function setMobile({input, state, path}) {
  var md = new MobileDetect(window.navigator.userAgent);
  state.set(`app.is_mobile`, (md.mobile() !== null));
}

function computeFieldBoundingBoxes({input, state, path}) {
  var bboxes = {};
  var areas = {};
  Promise.map(Object.keys(input.fields), (field) => {
    bboxes[field] = computeBoundingBox(input.fields[field].boundary.geojson);
    areas[field] = gjArea.geometry(input.fields[field].boundary.geojson)/4046.86;
    return true;
  }).then((result) => {
    return path.success({bboxes, areas})
  }).catch((err) => {
    return path.error({err});
  })
}

function setFieldBoundingBoxes({input, state}) {
//TODO: need to check for valid data source
  Object.keys(input.bboxes).forEach((field) => {
    state.set(['app', 'model', 'fields', field, 'boundary', 'area'], input.areas[field]);
    state.set(['app', 'model', 'fields', field, 'boundary', 'bbox'], input.bboxes[field]);
    state.set(['app', 'model', 'fields', field, 'boundary', 'centroid'], [(input.bboxes[field].north + input.bboxes[field].south)/2, (input.bboxes[field].east + input.bboxes[field].west)/2]);
  })
}

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

function getFieldsFromDatasilo({state, path}) {
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

      return path.success({fields: oadaFields});
    })
    .catch(function(error) {
      return path.error(error);
    })
}

function getFieldsFromOada({state, path}) {
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var url = 'https://' + domain + '/bookmarks/fields/fields-index/';
  var fields = {};
  return cache.get(url, token).then(function(fieldsIndex) {
    return Promise.map(Object.keys(fieldsIndex), function(item) {
      return cache.get(url + item, token).then(function(fieldItem) {
        if (fieldItem['fields-index']) {
          return cache.get(url + item + '/fields-index/', token).then(function(fieldKeys) {
            return Promise.map(Object.keys(fieldKeys), function(key) {
              return cache.get(url + item + '/fields-index/'+key, token).then(function(field) {
                fields[key] = field;
                return true;
              })
            })
          })
        } else {
          return cache.get(url + item, token).then(function(field) {
            fields[item] = field;
            return true;
          })
        }
      })
    }) 
  }).then(function() {
    return path.success({fields});
  }).catch(() => {
    return path.error({fields});
  })
}

function setFieldBoundaries({input, state}) {
  if (input.fields) {
    Object.keys(input.fields).forEach(function(field) {
      state.set(['app', 'model', 'fields', field], input.fields[field]);
    })
  }
}


function getYieldDataIndexFromOada({state, path}) {
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
    return path.success({data, cropStatus});
  })
}

function setYieldDataIndex({input, state}) {
  if (input.data) {
    Object.keys(input.data).forEach(function(crop) {
      state.set(['app', 'view', 'map', 'crop_layers', crop, 'visible'], true);
      state.set(['app', 'view', 'map', 'geohashes_to_draw', crop], {});
      Object.keys(input.data[crop]).forEach(function(ghLength) {
        state.set(['app', 'model', 'yield_data_index', crop, ghLength], input.data[crop][ghLength]);
      })
    })
  }
}

function destroyCache({path}) {
  return db().destroy()
  .then((result) => {
    return path.success({result})
  }).catch((error) => {
    return path.error({error})
  })
};

function registerGeohashes({input, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
  var coordsIndex = input.coords.z.toString() + '-' + input.coords.x.toString() + '-' + input.coords.y.toString();
  state.set(['app', 'view', 'map', 'geohashes_on_screen', input.layer, coordsIndex], input.geohashes)
}

function unregisterGeohashes({input, state}) {
  var coordsIndex = input.coords.z.toString() + '-' + input.coords.x.toString() + '-' + input.coords.y.toString();
  state.unset(['app', 'view', 'map', 'geohashes_on_screen', input.layer, coordsIndex]);
}

function testOadaConnection({state, path}) {
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var url = 'https://'+domain+'/bookmarks/';
  return agent('GET', url)
  .set('Authorization', 'Bearer '+ token)
  .end()
  .then(function(response) {
    return path.success({});
  }).catch(function(err) {
    return path.error({});
  })
}

function getOadaToken({input, state, path}) {
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHBzOi8vdHJpYWxzdHJhY2tlci5vYWRhLWRldi5jb20vb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJUcmlhbHMgVHJhY2tlciIsImNsaWVudF91cmkiOiJodHRwczovL2dpdGh1Yi5jb20vT3BlbkFUSy9UcmlhbHNUcmFja2VyIiwiY29udGFjdHMiOlsiU2FtIE5vZWwgPHNhbm9lbEBwdXJkdWUuZWR1PiJdLCJzb2Z0d2FyZV9pZCI6IjVjYzY1YjIwLTUzYzAtNDJmMS05NjRlLWEyNTgxODA5MzM0NCIsInJlZ2lzdHJhdGlvbl9wcm92aWRlciI6Imh0dHBzOi8vaWRlbnRpdHkub2FkYS1kZXYuY29tIiwiaWF0IjoxNDc1NjA5NTkwfQ.Qsve_NiyQHGf_PclMArHEnBuVyCWvH9X7awLkO1rT-4Sfdoq0zV_ZhYlvI4QAyYSWF_dqMyiYYokeZoQ0sJGK7ZneFwRFXrVFCoRjwXLgHKaJ0QfV9Viaz3cVo3I4xyzbY4SjKizuI3cwfqFylwqfVrffHjuKR4zEmW6bNT5irI',
    scope: 'yield-data field-notes field-boundaries',
//      params: {
//        "redirect_uri": 'https://trialstracker.oada-dev.com/oauth2/redirect.html', 
      "redirect": 'http://localhost:8000/oauth2/redirect.html',
//      }
  }
  var domain = state.get('app.settings.data_sources.yield.oada_domain'); //TODO: don't hard code this as the source of the domain
  oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
    if (err) { console.dir(err); return path.error(err); } // Something went wrong  
    return path.success({token:accessToken.access_token});
  })
}
