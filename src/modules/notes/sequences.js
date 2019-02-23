import { pop, equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import urlLib from 'url'
import polygonsIntersect from '../map/utils/polygonsIntersect';
import computeBoundingBox from '../map/utils/computeBoundingBox'
import gaussian from 'gaussian';
import gjArea from '@mapbox/geojson-area';
import { sequence } from 'cerebral'
import uuid from 'uuid';
import rmc from 'random-material-color';
import _ from 'lodash';
import Color from 'color';
import * as fields from '@oada/fields-module/sequences';
import * as yieldMod from '../yield/sequences.js';
import * as map from '../map/sequences.js';
import { state, props } from 'cerebral/tags'
import md5 from 'md5'
import oadaMod from '@oada/cerebral-module/sequences'
import harvest from '../yield/getHarvest'
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager'
const dist = require('gaussian')(0, 1);
let B;

//TODO: after creating a new note, after stats are made, the stats weren't being
//mapped into notes.notes. changed fetchYieldStats to watchYieldStats.
//Also made mapOadaToRecords take props.notes or state.get oadaNotes

const tree = {
  'bookmarks': {
    '_type': 'application/vnd.oada.bookmarks.1+json',
    '_rev': '0-0',
    'notes': {
      '_type': 'application/vnd.oada.notes.1+json',
      '_rev': '0-0',
      'fields-index': {
        '*': {
          '_type': 'application/vnd.oada.note.1+json',
          '_rev': '0-0',
          'yield-stats': {
            '_type': 'application/vnd.oada.yield.1+json',
            'geohashes': {
              '*': {
                'crop-index': {
                  '*': {
                    'bucket': {
                      '_type': 'application/vnd.oada.yield.1+json',
                      '_rev': '0-0'
                    }
                  }
                }
              }
            },
          }
        }
      },
      'notes-index': {
        '*': {
          '_type': 'application/vnd.oada.note.1+json',
          '_rev': '0-0',
          'yield-stats': {
            '_type': 'application/vnd.oada.yield.1+json',
            'geohashes': {
              '*': {
                'crop-index': {
                  '*': {
                    'bucket': {
                      '_type': 'application/vnd.oada.yield.1+json',
                      '_rev': '0-0'
                    }
                  }
                }
              }
            },
          }
        }
      }
    }
  }
}

const fetch = sequence('notes.fetch', [
  ({props, state}) => ({
    requests: [{
      path: '/bookmarks/notes',
      tree,
      connection_id: state.get('notes.connection_id'),
      watch: {
        signals: ['notes.handleNotesWatch',]
      },
    }]
	}),
  oadaMod.get,
  when(state`oada.${props`connection_id`}.bookmarks.notes`), {
    true: [],
    false: [
      set(props`type`, undefined),
      ({props, state}) => ({
        requests: [{
          tree,
          data: {},
          path: '/bookmarks/notes',
          connection_id: props.connection_id,
        }]
      }),
      oadaMod.put,
      ({props, state}) => ({
        requests: [{
          path: '/bookmarks/notes',
          tree,
          connection_id: props.connection_id,
          watch: {
            signals: ['notes.mapOadaToRecords',]
          },
        }]
      }),
      oadaMod.get,
    ],
  },
])

export const mapOadaToRecords = sequence('notes.mapOadaToRecords', [
  ({state, props}) => {
    let connection_id = state.get('notes.connection_id');
    let notes = {};
    var oadaNotes = state.get(`oada.${connection_id}.bookmarks.notes`)
    return Promise.map(Object.keys(oadaNotes || {}), (idx) => {
      if (idx.charAt(0) === '_') return
      var index = idx.replace(/-index/, '');
      notes[index] = notes[index] || {};
      return Promise.map(Object.keys(oadaNotes[idx] || {}), (key) => {
      // ignore reserved keys used by oada
        if (key.charAt(0) !== '_' && oadaNotes[idx][key]) {
          notes[index][key] = oadaNotes[idx][key];
        }
        return
      }).then(() => {
        state.set(`notes.${index}`, notes[index])
      })
    }).then(() => {
      return {notes}
    })
  }
])

export const handleNotesWatch = sequence('notes.handleNotesWatch', [
  equals(props`response.change.type`), {
    'merge': [
      ({state, props}) => {
        var oldState = _.cloneDeep(state.get(`oada.${props.connection_id}.${props.path}`));;
        var newState = _.merge(oldState, props.response.change.body);
        state.set(`oada.${props.connection_id}.${props.path}`, newState);
      },
    ],
    'delete': [
      ({state, props}) => {
        var nullPath = props.nullPath.replace(/^\//, '').split('/').join('.');
        state.unset(`oada.${props.connection_id}.${props.path}.${nullPath}`);
      }
    ]
  },
  mapOadaToRecords,
])


const watchYieldStats = sequence('notes.watchYieldStats', [
  ({state, props}) => {
    var requests = [];
    return Promise.map(Object.keys(props.notes || {}), (noteType) => {
      return Promise.map(Object.keys(props.notes[noteType] || {}), (key) => {
        if (!props.notes[noteType][key]['yield-stats']) return
        return requests.push({
          path: `/bookmarks/notes/${noteType}-index/${key}/yield-stats`,
          watch: {
            signals: ['notes.handleYieldStats'],
            payload: {
              id: key,
              index: noteType
            }
          },
        })
      })
    }).then(() => {
      return {requests, tree, connection_id: state.get('notes.connection_id')}
    })
  },
  oadaMod.get
])


// Send note changes to the server
export const oadaUpdateNotes = sequence('notes.updateNotes', [
  ({props, state}) => {
    var note = _.cloneDeep(state.get(`notes.${props.noteType}.${props.id}`));
    delete note['yield-stats'];
    console.log(note);
    var requests = [{
      data: note,
      path: `/bookmarks/notes/${props.noteType}-index/${props.id}`,
    }];
    return {requests, tree, connection_id: state.get('notes.connection_id')}
	},
  set(props`type`, undefined),
	oadaMod.put,
]);

export const createYieldStats = sequence('notes.createYieldStats', [
  ({state,props}) => {
    return Promise.map(props.polygons || [], (obj) => {
      if (!obj.geohashes || !obj.stats || !obj.id || !props.noteType) console.log('its this one', obj.geohashes, obj.stats, obj.id, props.noteType);
      if (!obj.geohashes || !obj.stats || !obj.id || !props.noteType) return
      return {
        path: `/bookmarks/notes/${props.noteType}-index/${obj.id}/yield-stats`,
        data: {
          geohashes: obj.geohashes,
          stats: obj.stats,
        },
      }
    }).then((requests) => {
      requests = requests.filter((req) => req ? true : false);
      return {requests, tree, connection_id: state.get('notes.connection_id')}
    })
  },
  oadaMod.put,
])

// 
export const getNoteStats = sequence('notes.getNoteStats', [
  getPolygons,
  yieldMod.getPolygonStats,
  getGeohashDistribution,
  createYieldStats,
  set(props`requests`, undefined),
])

// Create array of objects with id, polygon, bbox, type
export function getPolygons({state, props}) {
  var polygons = [];
	return Promise.map(Object.keys(props.notes || {}), (noteType) => {
    return Promise.map(Object.keys(props.notes[noteType] || {}), (id) => {
      console.log('111');
      if (!props.notes[noteType][id].boundary.geojson) return
      state.set(`notes.${noteType}.${id}.yield-stats`, {computing:true})
      return polygons.push({
        id,
        polygon: props.notes[noteType][id].boundary.geojson.coordinates[0] || [],
        bbox: props.notes[noteType][id].boundary.bbox || [],
        type: props.noteType
      })
    })
	}).then(() => {
		polygons = polygons.filter((polygon) => (polygon) ? true: false);
		return {polygons}
	})
}

function addNoteToGeohashIndex({props, state}) {
  B = Date.now();
	return Promise.map(props.polygons, (polygon) => {
    return Promise.map(Object.keys(polygon.geohashes || {}), (gh) => {
      if (gh.length > 7) return
      //geohashNoteIndexManager.set(gh, polygon.id);
      /*
      if (polygon) return oada.put({
        path: `/bookmarks/notes/${polygon.id}/yield-stats`,
        data: 
        connection_id: ''
      })
      */
      return
    })
  }).then(() => { 
    console.log('B', (Date.now() - B)/1000)
		return 
	})
}

// Update stats in response to updates to yield tiles (attached to notes) that are
// being watched. This must happen before mapOadaToRecords in order to find the 
// old stats used before adding the new.
export const getYieldStats = sequence('notes.getYieldStats', [
  ({state, props}) => {
    console.log('GET YIELD STATS')
    var connection_id = state.get('yield.connection_id');
    var body = props.response.change.body;
    var notes = {};
    var index = props.index;
    var id = props.id;
    // Exclude changes to stats key of yield-stats to avoid infinite loops
    if (body.stats) return
    var yieldStats = state.get(`notes.${index.replace(/\-index/, '')}.${id}.yield-stats`) || {};
    var stats = {};
    return Promise.map(Object.keys(body.geohashes || {}), (geohash) => {
      return Promise.map(Object.keys(body.geohashes[geohash]['crop-index'] || {}), (crop) => {
        if (yieldStats.geohashes[geohash] && yieldStats.geohashes[geohash]['crop-index'][crop].bucket) {
          if (yieldStats.geohashes[geohash].aggregates) {
            // Sub-bucket (aggregate) level geohashes used to calculate stats.
            return Promise.map(Object.keys(body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'] || {}), (aggregate) => {
              if (!yieldStats.geohashes[geohash].aggregates[aggregate]) return
              stats[crop] = stats[crop] || {};
              // Remove the current aggregate used in the stats calculation 
              // before adding the new aggregate
              console.log('BEFORE1 total data', aggregate, _.cloneDeep(yieldStats.stats[crop]));
              var oldGhData = yieldStats.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'] || {};
              console.log('BEFORE1 existing aggregate (subtracting)', aggregate, oldGhData[aggregate]);
              stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], oldGhData[aggregate], -1);
              console.log('MIDDLE1 sum after subtracting', aggregate, _.cloneDeep(stats[crop]));
              console.log('MIDDLE1 now adding aggregate', body, geohash, crop, aggregate, _.cloneDeep(body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'][aggregate]));
              if (props.response.change.type === 'delete') return
              stats[crop] = harvest.recomputeStats(stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket['geohash-data'][aggregate]);
              console.log('AFTER1 total', aggregate, _.cloneDeep(stats[crop]));
              return
            })
          } else {
            // Bucket level geohashes used to calculate stats. Use the bucket.
            if (!yieldStats.geohashes) {
              if (props.response.change.type === 'delete') {
                return
              } else {
                stats[crop] = stats[crop] || {};
                stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket.stats);
                console.log('BUCKET', stats[crop])
                return
              }
            } else {
              // Remove the current stats used in the stats calculation before
              // adding the new stats.
              console.log('BEFORE bucket', geohash, crop, _.cloneDeep(stats[crop]))
              stats[crop] = stats[crop] || {};
              stats[crop] = harvest.recomputeStats(yieldStats.stats[crop], yieldStats.geohashes[geohash]['crop-index'][crop].bucket.stats, -1);
              stats[crop] = harvest.recomputeStats(stats[crop], body.geohashes[geohash]['crop-index'][crop].bucket.stats);
              console.log('AFTER bucket', geohash, crop, _.cloneDeep(stats[crop]))
              return
            }
          }
        } else return
      })
    }).then(() => {
      if (stats && Object.keys(stats).length > 0) {
        notes[index] = notes[index] || {};
        notes[index][id] = notes[index][id] || {};
        notes[index][id].stats = stats;
      }
      return 
		}).then(() => {
      return {notes}
    })
  },

  ({props, state}) => {
    var requests = [];
    return Promise.map(Object.keys(props.notes || {}), (index) => {
      return Promise.map(Object.keys(props.notes[index] || {}), (id) => {
        return requests.push({
          path: `/bookmarks/notes/${index}/${id}/yield-stats`,
          data: { stats: props.notes[index][id].stats} ,
        })
      })
    }).then(() => {
      return {requests, tree, connection_id: state.get('notes.connection_id')}
    })
  },
  oadaMod.put
])

// This sequence is used to respond to the watch on /bookmarks/notes
export const handleYieldStats = sequence('notes.handleYieldStats', [
  getYieldStats,
  mapOadaToRecords,
])

// Return props.notes based on the change body contents
function notesFromChange({state, props}) {
  if (props.response.change.type === 'delete') return
  var body = props.response.change.body;
  var notes = {};
  return Promise.map(Object.keys(body || {}), (index) => {
    if (/^_/.test(index)) return
    return Promise.map(Object.keys(body[index] || {}), (id) => {
      if (/^_/.test(id)) return
      notes[index] = notes[index] || {};
      notes[index][id] = body[index][id];
      return
    })
  }).then(() => {
    return {notes}
  })
}

export const doneClicked = sequence('notes.doneClicked', [
	set(props`noteType`, state`notes.selected_note.type`),
	set(props`id`, state`notes.selected_note.id`),
  //	set(props`note`, state`notes.${props`noteType`}.${props`id`}`),
  set(state`view.editing`, false), 
	oadaUpdateNotes,
  set(props`requests`, undefined),
  getNoteStats,
  watchYieldStats,
  mapOadaToRecords,
]);

export const createFieldNotes = sequence('notes.createFieldNotes', [
  ({state,props}) => {
    return Promise.map(Object.keys(props.fieldNotes || {}), (id) => {
      return {
        path: `/bookmarks/notes/fields-index/${id}`,
        data: props.fieldNotes[id],
        tree,
        connection_id: state.get('notes.connection_id'),
      }
    }).then((requests) => {
      return {requests}
    })
  },
  oadaMod.put,
  ({state, props}) => {
    var fieldNotes = state.get('notes.fields')
    var notes = {'fields': {}}
    return Promise.map(Object.keys(fieldNotes || {}), (key) => {
      if (!fieldNotes[key]['yield-stats']) return
      notes['fields'][key] = fieldNotes[key];
    }).then(() => {
      return {notes}
    })
  },
  getNoteStats,
  ({state,props}) => {
    return Promise.map(Object.keys(props.deletes || {}), (id) => {
      return {
        path: `/bookmarks/notes/fields-index/${id}`,
        tree,
        connection_id: state.get('notes.connection_id'),
      }
    }).then((requests) => {
      return {requests}
    })
  },
  oadaMod.delete,
])

export const checkForNewFields = sequence('notes.getFieldsNotes', [
  mapFieldsToNotes,
  createFieldNotes,
])

export const getFieldNotes = sequence('notes.getFieldNotes', [
  set(state`notes.fields`, {}),
  set(props`noteType`, 'fields'),
  ({props, state}) => ({
    fields: state.get(`oada.${state.get(`fields.connection_id`)}.bookmarks.fields`),
  }),
  mapOadaFieldsToRecords,
  // checkForNewFields,
  set(props`notes`, props`fieldNotes`),
]);

export const init = sequence('notes.init', [
  set(props`noteType`, 'notes'),
  ({props}) => console.log('oada connection'),
  oadaMod.connect,
  set(state`notes.connection_id`, props`connection_id`),
	//	set(state`notes.loading`, true),
	//assumes oada has been initialized with a connection_id and valid token
  ({}) => console.time('fetch'),
  fetch,
  ({}) => console.timeEnd('fetch'),
  ({}) => console.log('done fetching'),
  ({}) => console.time('mapping'),
  mapOadaToRecords,
  ({}) => console.timeEnd('mapping'),
  ({}) => console.log('done mapping'),
  /*
  watchYieldStats,
  ({}) => console.log('done watching'),
  */
  set(state`map.layers.Notes`, {visible: true}),
	getTagsList,
  set(state`notes.loading`, false),
  set(state`fields.loading`, false),
  /*
  when(state`fields.records`), {
    true: [getFieldNotes],
    false: [
    ]
  },
    /*
  getNoteComparisons,
  ({state}) => {
    console.log(state.get('notes.notes'))
  }
  */
])

export const expandComparisonsClicked = sequence('notes.expandComparisonsClicked', [
  toggle(state`notes.${props`noteType`}.${props`id`}.expanded`)
]);

export const cancelNoteButtonClicked = sequence('notes.cancelNoteButtonClicked', [
  set(state`view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.${props`noteType`}.${props`id`}`)
])

export const toggleNoteDropdown = sequence('notes.toggleNoteDropdown', [
  set(state`notes.note_dropdown.id`, props`id`),
  ({state, props}) => {
    if (props.value) {
      state.set(`notes.note_dropdown.visible`, props.value);
    } else {
      var curState = state.get(`notes.note_dropdown.visible`);
      state.set(`notes.note_dropdown.visible`, !curState);
    }
  }
]);

export const editNoteButtonClicked = sequence('notes.editNoteButtonClicked', [
  set(state`notes.note_dropdown.visible`, false),
  unset(state`notes.note_dropdown.id`),
  set(state`view.editing`, true),
	set(state`notes.selected_note.id`, props`id`),
	set(state`notes.selected_note.type`, props`noteType`),
  toggleNoteDropdown,
])

export const tagAdded = sequence('notes.tagAdded', [
  set(state`notes.tag_input_text`, ''),
	addTagToNote, {
		error: [
			set(state`notes.${props`noteType`}.${props`id`}.tag_error`, props`message`),
      wait(2000), {
				continue: [
    			unset(state`notes.${props`noteType`}.${props`id`}.tag_error`),
				]
			}
		],
		success: [],
	},
])

export const tagRemoved = sequence('notes.tagRemoved', [
  unset(state`notes.${props`noteType`}.${props`id`}.tags.${props`key`}`),
  ({props, state}) => ({
    requests: [{
      path: `/bookmarks/notes/${props.noteType}-index/${props.id}/tags/${props.key}`,
      connection_id: state.get('notes.connection_id'),
      type:'application/vnd.oada.note.1+json',
    }],
  }),
  oadaMod.delete,

	removeTagFromMasterTagsList,
]);

export const noteListClicked = sequence('notes.noteListClicked', [
	unset(state`notes.selected_note`),
  set(state`view.editing`, false),
]);

export const exitNoteEditMode = sequence('notes.exitNoteDitMode', [
])

export const tabClicked = sequence('notes.tabClicked', [
  set(state`notes.tab`, props`tab`),
])

export const unwatchNote = sequence('notes.unwatchNote', [
  ({state, props, oada}) => {
    return oada.delete({
      path: `/bookmarks/notes/${props.noteType}-index/${props.id}`,
      unwatch: true,
      connection_id: state.get('notes.connection_id'),
    }).then(() => {
      return oada.delete({
        path: `/bookmarks/notes/${props.noteType}-index/${props.id}/yield-stats`,
        unwatch: true,
        connection_id: state.get('notes.connection_id'),
      }).catch(() => {
        // Theres a chance no yield-stats were created initially if something goes wrong
        return
      })
    })
  },
])

export const deleteNoteButtonClicked = sequence('notes.deleteNoteButtonClicked', [
  set(state`notes.note_dropdown.visible`, false),
  unset(state`notes.note_dropdown.id`),
	set(props`note`, state`notes.${props`noteType`}.${props`id`}`),
	set(state`view.editing`, false),
	checkTags,
  unset(state`notes.selected_note`),
  unset(state`notes.${props`noteType`}.${props`id`}`),//optimistic
	unwatchNote,
  ({state, props}) => ({
    requests: [{
      path: `/bookmarks/notes/${props.noteType}-index/${props.id}`,
      connection_id: state.get('notes.connection_id'),
      type:'application/vnd.oada.note.1+json',
    }],
	}),
  set(props`type`,'application/vnd.oada.note.1+json'),
	oadaMod.delete,
]);


export const noteTextChanged = sequence('notes.noteTextChanged', [
  set(state`notes.${props`noteType`}.${props`id`}.text`, props`value`)
]);

export const tagTextChanged = sequence('notes.tagTextChanged', [
	unset(state`notes.${props`noteType`}.${props`id`}.tag_error`),
  set(state`notes.tag_input_text`, props`value`),
]);

export const createNewNote = sequence('notes.createNewNote', [
  createNote, 
  set(state`notes.selected_note.id`, props`note.id`),
  //Optimistic update
  set(state`notes.${props`noteType`}.${props`note.id`}`, props`note`),
  ({props, state}) => ({
    requests: [{
      data: props.note,
      path: `/bookmarks/notes/${props.noteType}-index/${props.note.id}`,
      connection_id: state.get('notes.connection_id'),
      tree,
    }],
  }),
  set(props`type`, undefined),
  oadaMod.put,
])

export const showHideButtonClicked = sequence('notes.showHideButtonClicked', [
  changeShowHide, 
]);

export const noteClicked = sequence('notes.noteClicked', [
  when(state`view.editing`), {
    true: [],
		false: [
      ({state, props}) => ({boundary: state.get(`notes.${props.noteType}.${props.id}.boundary`)}),
      map.fitGeometry,
			set(state`notes.selected_note.id`, props`id`),
			set(state`notes.selected_note.type`, props`noteType`),
    ],
  },
]);


// find distribution of geohash size and number of points
function getGeohashDistribution({state, props}) {
  var stuff = {
    'total-geohashes': 0,
    'total-count': 0,
    'geohash-1': 0,
    'geohash-2': 0,
    'geohash-3': 0,
    'geohash-4': 0,
    'geohash-5': 0,
    'geohash-6': 0,
    'geohash-7': 0,
    'geohash-8': 0,
    'geohash-9': 0,

  };
  return Promise.map(props.polygons || [], (obj) => {
    return Promise.map(Object.keys(obj.stats || {}), (key) => {
      stuff['total-count']+= obj.stats[key].count;
      return
    }).then(() => {
      if (Object.keys(obj.stats || {}).length === 0) return
      return Promise.map(Object.keys(obj.geohashes || {}), (bucket) => {
        return Promise.map(Object.keys(obj.geohashes[bucket].aggregates || {}), (aggregate) => {
          stuff['geohash-'+aggregate.length]++;
          stuff['total-geohashes']++;
          return
        })
      })
    })
  }).then(() => {
    // console.log(stuff);
    return
  })
}

function mapOadaFieldsToRecords({state, props}) {
  state.set('notes.fields', {});
  let connection_id = state.get('notes.connection_id');
  let oadaFieldNotes =  state.get(`oada.${connection_id}.bookmarks.notes.fields-index`);
  let fieldNotes = {};
  return Promise.map(Object.keys(oadaFieldNotes || {}), (key) => {
		// ignore reserved keys used by oada
    if (key.charAt(0) !== '_') {
      state.set(`notes.fields.${oadaFieldNotes[key].id}`, oadaFieldNotes[key])
      fieldNotes[key] = oadaFieldNotes[key];
    }
		return
  }).then(() => {
    return {fieldNotes}
  })
}

function getTagsList({state}) {
	let tags = {};
	let notes = state.get(`notes`);
  return Promise.map(['fields', 'notes'], (noteType) => {
    return Promise.map(Object.keys(notes[noteType] || {}), (note) => {
      return Promise.map(Object.keys(notes[noteType][note].tags || {}), (key) => {
		  	tags[key] = tags[key] || {text: notes[noteType][note].tags[key], references: 0}
		  	tags[key].references++
        return
      })
		})
	}).then(() => {
		state.set(`notes.tags`, tags)
		return
	})
}

function changeShowHide ({props, state}) {
  var boundaryVisible = state.get(`notes.${props`noteType`}.${props.id}.boundary`, 'visible');
  if (boundaryVisible) {
    state.set(`notes.${props`noteType`}.${props.id}.boundary.visible`, false);
  } else {
    state.set(`notes.${props`noteType`}.${props.id}.boundary.visible`, true);
  }
};

function createNote({props, state}) {
  var note = {
    created: Date.now(),
    id: uuid.v4(),
    text: '',
    tags: {},
    fields: {},
    boundary: { 
      visible: true,
    },
    color: rmc.getColor(),
  };
  note._id = 'resources/'+note.id;
  var noteType = state.get('notes.tab') == 0 ? 'notes' : 'fields';
	return { noteType, note }
};

function getFontColor(color) {
  var L = Color(color).luminosity();
  if (L > 0.179) {
    return '#000000';
  } else {
    return '#ffffff';
  }
}

function checkTags ({props, state}) {
  var tags = state.get(`notes.tags`);
	var noteTags = state.get(`notes.${props.noteType}.${props.id}.tags`);
  Object.keys(noteTags || {}).forEach((key, i) => {
    if (tags[key].references <= 1) {
      state.unset(`notes.tags.${key}`); 
    }
  })
}

function addTagToNote({props, state, path}) {

	var text = props.text.toLowerCase().trim();
	if (text === '') {
		return path.error({message: 'Tag text required'})
  } else {

    var tags = state.get(`notes.tags`);
    var hash = md5(text);
    if (!tags[hash]) {
      state.set(`notes.tags.${hash}`, { 
        text,
        references: 1
      });
    } else {
      var noteTags = state.get(`notes.${props.noteType}.${props.id}.tags`)
      console.log(noteTags, !noteTags[hash]);
      if (!noteTags[hash]) { // not already accounted for on 
        console.log('going to increment');
        state.set(`notes.tags.${hash}.references`, tags[hash].references+1);
      }
    }
		state.set(`notes.${props.noteType}.${props.id}.tags.${hash}`, text);
		return path.success()
	}
};

function removeTagFromMasterTagsList({props, state}) {
  var refs = state.get(`notes.tags.${props.key}.references`);
  if (!refs || refs === 0) {
    console.log('ifff', refs)
		state.unset(`notes.tags.${props.key}`);
  } else {
    console.log('else', refs)
    state.set(`notes.tags.${props.key}.references`, refs - 1);
  }
};

//Create notes at /bookmarks/notes from each field
function mapFieldsToNotes({state, props}) {
  let fieldNotes = {};
  let notes = _.clone(state.get(`notes.fields`));
  if (props.fields) {
    return Promise.map(Object.keys(props.fields['fields-index'] || {}), (farmName) => {
      if (props.fields['fields-index'][farmName]) {
        return Promise.map(Object.keys(props.fields['fields-index'][farmName]['fields-index'] || {}), (fieldName) => {
          let field = props.fields['fields-index'][farmName]['fields-index'][fieldName];
          if (!notes[farmName+'-'+fieldName] && field.boundary) {
            let bbox = computeBoundingBox(field.boundary.geojson);           
            var id = farmName+'-'+fieldName;
            fieldNotes[id] = {
              created: Date.now(),
              id: farmName+'-'+fieldName,
              text: farmName+' - '+fieldName,
              tags: [],
              field: {
                _id: field._id,
                _rev: field._rev,
              },
              boundary: {
                geojson: field.boundary.geojson,
                centroid:[
                  (bbox.north + bbox.south)/2, 
                  (bbox.east + bbox.west)/2
                ],
                visible: true,
                bbox,
                area: gjArea.geometry(field.boundary.geojson)/4046.86,
              },
              color: rmc.getColor(),
            };
          } else delete notes[farmName+'-'+fieldName]
          return
        })
      }
    }).then(() => {
      return {fieldNotes, deletes: notes}
    })
  } else return {fieldNotes}
}

function getNoteComparisons({props, state}) {
	var notes = state.get('notes.notes');
  var fields = state.get('notes.fields');
  if (fields && notes) {
    return Promise.map(Object.keys(notes), (noteId) => {
      if (notes[noteId].boundary && notes[noteId].boundary.geojson && notes[noteId].boundary.geojson.coordinates && notes[noteId].boundary.geojson.coordinates[0] && notes[noteId].boundary.geojson.coordinates[0].length > 3) {
        return Promise.map(Object.keys(fields), (fieldId) => {
          if (polygonsIntersect(fields[fieldId].boundary.geojson.coordinates[0], notes[noteId].boundary.geojson.coordinates[0])) {
            if (fields[fieldId]['yield-stats'] && fields[fieldId]['yield-stats'].stats) {
              return Promise.map(Object.keys(fields[fieldId]['yield-stats'].stats), (crop) => {
								if (notes[noteId]['yield-stats'].stats[crop]) {
									var fieldStats = fields[fieldId]['yield-stats'].stats[crop];
                  var noteStats = notes[noteId]['yield-stats'].stats[crop];
                  var differenceMeans = fieldStats.yield.mean - noteStats.yield.mean;
                  var standardError = Math.pow((fieldStats.yield.variance/fieldStats.count) + (noteStats.yield.variance/noteStats.count), 0.5);
                  var zScore = Math.abs(differenceMeans)/standardError;
                  var pValue = zScore > 0 ? 2*(1 - dist.cdf(zScore)) : 2*(dist.cdf(zScore))
                  var comparison = {
                    differenceMeans,
                    standardError,
                    zScore,
                    pValue,
                    signficantDifference: pValue < 0.05
                  }
                  state.set(`notes.fields.${fieldId}.notes.${noteId}.${crop}.comparison`, comparison);
                  state.set(`notes.notes.${noteId}.fields.${fieldId}.${crop}.comparison`, comparison);
                  return
                } else return
              })
            } else return
          } else return
        })
      } else return
    }).then((result) => {
      return
		}).catch((error) => {
      return
		})
  } else return
}

export const addPoint = sequence('notes.addPoint', [
  ({state, props}) => ({
		noteType: state.get('notes.selected_note.type'),
		id: state.get('notes.selected_note.id'),
	}),
  dropPoint, 
  map.updateGeometry, 
  set(state`notes.${props`noteType`}.${props`id`}.boundary`, props`boundary`),
])

function dropPoint ({props, state}) {
  let boundary = state.get(`notes.${props.noteType}.${props.id}.boundary`);
	if (boundary && boundary.geojson) {
    boundary.geojson.coordinates[0].push(props.pt);
  } else {
		boundary = {
      geojson: {
				type: "Polygon",
				coordinates: [[props.pt]]
			}
		};
	}
	state.set(`notes.${props.noteType}.${props.id}.boundary`, boundary);
	return {
		boundary
	}
}

export let markerDragged = sequence('notes.markerDragged', [
  set(state`notes.${props`noteType`}.${props`id`}.boundary.geojson.coordinates.0.${props`idx`}.0`, props`lng`),
  set(state`notes.${props`noteType`}.${props`id`}.boundary.geojson.coordinates.0.${props`idx`}.1`, props`lat`),
  map.updateGeometry,
  set(state`notes.${props`noteType`}.${props`id`}.boundary`, props`boundary`),
]);

export const undo = sequence('notes.undo', [
  ({props}) => {console.log(props)},
  when(state`notes.${props`noteType`}.${props`id`}.boundary.geojson.coordinates.0`), {
    true: [
      pop(state`notes.${props`noteType`}.${props`id`}.boundary.geojson.coordinates.0`),
    ],
    false: [],
  },
  map.updateGeometry,
  ({props}) => {console.log(props)},
	set(state`notes.${props`noteType`}.${props`id`}.boundary`, props`boundary`),
])

export const undoButtonClicked = sequence('notes.undoButtonClicked', [
  undo, 
]);

export const mouseDownOnMap = sequence('notes.mouseDownOnMap', [
  addPoint,
]);

export const addNoteButtonClicked = sequence('notes.addNoteButtonClicked', [
//TODO: perhaps restrict whether a note can be added while another is editted
  unset(state`notes.selected_note`),
  equals(state`notes.tab`), {
    0: [
      set(props`noteType`, 'notes'),
	    set(state`notes.selected_note.type`, props`noteType`),
	    set(state`view.editing`, true),
      createNewNote,
    ],

    1: [
      set(props`noteType`, 'fields'),
	    set(state`notes.selected_note.type`, props`noteType`),
	    set(state`view.editing`, true),
      fields.createNewField,
      set(props`fields`, {[props`field.name`]: props`field`}),
      //mapFieldsToNotes,
      //set(state`notes.fields`, props`notes`),
    ],

    2: [],
	},
])


//TODO: This one could use an index of geohash -> notes perhaps...
// As new geohash buckets enter our index, create links from these geohashes to
// the relevant notes' yield-stats geohashes
export const handleYieldStatsGeohashes = sequence('notes.handleYieldStatsGeohashes', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var body = props.response.change.body;
    var notes = {};
    var stateNotes = state.get('notes')
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
          // If that geohash belongs to a particular note, recalulate stats
          // If it hasn't been watched, setup the link(!!!) The watch is already established
          return Promise.map(['notes', 'fields'], (index) => {
            notes[index] = notes[index] || {};
            return Promise.map(Object.keys(stateNotes[index] || {}), (id) => {
              console.log(index,id)
              console.log(stateNotes[index])
              console.log(stateNotes[index][id])
              console.log(stateNotes[index][id]['yield-stats'])
              if (stateNotes[index][id]['yield-stats'] && stateNotes[index][id]['yield-stats'].geohashes[geohash]) {
                notes[index][id] = stateNotes[index][id];
                //              if (stateNotes[id]['yield-stats'].geohashes[geohash][crop] && !stateNotes[id]['yield-stats'].geohashes[geohash][crop]._id) {
                if (props.response.change.type === 'delete') {
                  return oada.delete({
                    path: `/bookmarks/notes/${index}-index/${id}/yield-stats/geohashes/${geohash}/${crop}/bucket`,
                    connection_id,
                  })
                } else {
                  return oada.put({
                    path: `/bookmarks/notes/${index}-index/${id}/yield-stats/geohashes/${geohash}/crop-index/${crop}/bucket`,
                    data: {
                      _id: body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'][geohash]._id,
                      _rev: '0-0'
                    },
                    tree,
                    connection_id,
                  })
                }
              } else return
            })
          })
        })
      })
    }).then(() => {
      return {notes}
    })
  },
])
