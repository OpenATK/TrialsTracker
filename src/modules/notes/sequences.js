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
import oada from '@oada/cerebral-module/sequences'
import harvest from '../yield/getHarvest'
//import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager'
const dist = require('gaussian')(0, 1);
let B;

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
            '_rev': '0-0',
            'geohashes': {
              '*': {
                '*': {
                  'bucket': {
                    '_type': 'application/vnd.oada.yield.1+json',
                    '_rev': '0-0'
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
            '_rev': '0-0',
            'geohashes': {
              '*': {
                '*': {
                  'bucket': {
                    '_type': 'application/vnd.oada.yield.1+json',
                    '_rev': '0-0'
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
    path: '/bookmarks/notes',
    tree,
    connection_id: state.get('notes.connection_id'),
    watch: {
      signals: ['notes.handleWatchUpdate',]
    },
	}),
  oada.get,
  when(state`oada.${props`connection_id`}.bookmarks.notes`), {
    true: [],
    false: [
      ({props, state}) => ({
        tree,
        data: {},
        path: '/bookmarks/notes',
        connection_id: props.connection_id,
      }),
      oada.put,
      ({props, state}) => ({
        path: '/bookmarks/notes',
        tree,
        connection_id: props.connection_id,
        watch: {
          signals: ['notes.handleWatchUpdate',]
        },
      }),
      oada.get,
    ],
  },
])

export const oadaUpdateNotes = sequence('notes.updateNotes', [
  ({props, state}) => {
    return Promise.map(Object.keys(props.notes), (id) => {
      var note = _.cloneDeep(props.notes[id])
      delete note['yield-stats']
      return {
        data: note,
        path: '/bookmarks/notes/notes-index/'+id,
        connection_id: state.get('notes.connection_id'),
        tree,
      }
    }).then((requests) => {
      return {requests}
    })
	},
	oada.put,
]);

export const createYieldStats = sequence('notes.createYieldStats', [
  ({state,props,oada}) => {
    return Promise.map(props.polygons || [], (obj) => {
      return {
        path: `/bookmarks/notes/${props.type === 'notes' ? 'notes' : 'fields'}-index/${obj.id}/yield-stats`,
        data: {
          geohashes: obj.geohashes,
          stats: obj.stats,
        },
        tree,
        connection_id: state.get('notes.connection_id'),
      }
    }).then((requests) => {
      return {requests}
    })
  },
  oada.put,
])

export const getNoteStats = sequence('notes.getNoteStats', [
  getPolygons,
  yieldMod.getPolygonStats,
  getGeohashDistribution,
  createYieldStats,
  setStats,
  set(props`requests`, undefined),
])

export function getPolygons({state, props}) {
	return Promise.map(Object.keys(props.notes || {}), (id) => {
    //if (props.notes[id]['yield-stats'] && props.notes[id]['yield-stats'].stats) return
    state.set(`notes.${props.type}.${id}.yield-stats`, {computing:true})
    let polygon;
    let bbox;
    if (props.notes[id].geometry && props.notes[id].geometry.geojson) {
      polygon = props.notes[id].geometry.geojson.coordinates[0];
      bbox = _.clone(props.notes[id].geometry.bbox);
    } else {
      polygon = [];
      bbox = []
    }
    return {
      id,
      polygon,
      bbox,
      type: props.type
    }
	}).then((polygons) => {
		polygons = polygons.filter((polygon) => (polygon) ? true: false);
		return {polygons}
	})
}

function addNoteToGeohashIndex({props, state, oada}) {
  B = Date.now();
	return Promise.map(props.polygons, (polygon) => {
    return Promise.map(Object.keys(polygon.geohashes || {}), (gh) => {
      if (gh.length > 7) return
      console.log('setting', gh)
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

function setStats({props, state}) {
	return Promise.map(props.polygons || [], (obj, i) => {
    if (!_.isEmpty(obj.stats)) {
			state.set(`notes.${obj.type}.${obj.id}.yield-stats`, props.requests[i].data);
		}
		state.unset(`notes.${obj.type}.${obj.id}.yield-stats.computing`);
		return obj
	}).then(() => {
		return
	})
}

// Get relevant notes that were updated. Exclude changes to stats.
export const getYieldStats = sequence('notes.getYieldStats', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var notes = {};
    return Promise.map(Object.keys(props.notes || {}), (id) => {
      var stats;
      // Exclude changes to stats key of yield-stats.
      var yieldStats = props.notes[id]['yield-stats'];
      if (yieldStats && yieldStats.stats) return
      yieldStats = state.get(`notes.notes.${id}.yield-stats`);
      return Promise.map(Object.keys(yieldStats.geohashes || {}), (geohash) => {
        return Promise.map(Object.keys(yieldStats.geohashes[geohash] || {}), (crop) => {
          if (yieldStats.geohashes[geohash][crop].bucket) {
            if (yieldStats.geohashes[geohash].aggregates) {
              return Promise.map(Object.keys(yieldStats.geohashes[geohash].aggregates || {}), (aggregate) => {
                console.log('4', yieldStats.geohashes)
                console.log('5', yieldStats.geohashes[geohash])
                stats = stats || {};
                stats[crop] = stats[crop] || {};
                return stats[crop] = harvest.recomputeStats(stats[crop], yieldStats.geohashes[geohash][crop].bucket['geohash-data'][aggregate]);
              })
            } else {
              console.log('1', yieldStats.geohashes)
              console.log('2', yieldStats.geohashes[geohash])
              console.log('3', yieldStats.geohashes[geohash][crop].bucket.stats)
              stats = stats || {};
              stats[crop] = stats[crop] || {};
              return stats[crop] = harvest.recomputeStats(stats[crop], yieldStats.geohashes[geohash][crop].bucket.stats);
            }
          } else return
        })
      }).then(() => {
        if (stats) {
          notes[id] = state.get(`notes.notes.${id}`);
          notes[id]['yield-stats'].stats = stats;
          state.set(`notes.notes${id}.yield-stats.stats`, stats)
        }
        return 
      })
		}).then(() => {
      return {notes}
    })
  },

  ({props, state}) => ({
    requests: Object.keys(props.notes || {}).map((id) => ({
      path: `/bookmarks/notes/notes-index/${id}/yield-stats/stats`,
      data: props.notes[id]['yield-stats'].stats,
      connection_id: state.get('notes.connection_id'),
      tree,
    }))
  }),
  oada.put
])

export const handleWatchUpdate = sequence('notes.handleWatchUpdate', [
  watchToNotes,
  //mapOadaFieldsToRecords,
  set(props`oadaNotes`, props`notes`),
  getYieldStats,
  mapOadaToRecords,
])

function watchToNotes({state, props}) {
  var body = props.response.change.body;
  var notes = {};
  return Promise.map(Object.keys(body || {}), (index) => {
    if (/^_/.test(index)) return
    return Promise.map(Object.keys(body[index] || {}), (id) => {
      if (/^_/.test(id)) return
      console.log('!!!!!!')
      notes[id] = body[index][id];
      console.log('GOT A NOTE', index, id, notes[id])
      console.log('!!!!!!')
      return
    })
  }).then(() => {
    return {notes}
  })
}

export const doneClicked = sequence('notes.doneClicked', [
	set(props`type`, state`notes.selected_note.type`),
	set(props`id`, state`notes.selected_note.id`),
	set(props`note`, state`notes.${props`type`}.${props`id`}`),
  set(state`app.view.editing`, false), 
  set(props`notes`, {[props`id`]: state`notes.${props`type`}.${props`id`}`}),
  getNoteStats,
  //TODO: find out whether this only does the one request
	oadaUpdateNotes,
]);

export const createFieldNotes = sequence('notes.createFieldNotes', [
  ({state,props}) => {
    console.log('createFieldNotes!!!!');
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
  oada.put,
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
  oada.delete,
])

export const checkForNewFields = sequence('notes.getFieldsNotes', [
  mapFieldsToNotes,
  createFieldNotes,
])

export const getFieldNotes = sequence('notes.getFieldNotes', [
  set(state`notes.fields`, {}),
  set(props`type`, 'fields'),
  ({props, state}) => ({
    fields: state.get(`oada.${state.get(`fields.connection_id`)}.bookmarks.fields`),
  }),
  mapOadaFieldsToRecords,
  checkForNewFields,
  set(props`notes`, props`fieldNotes`),
  //getNoteStats,
]);

export const init = sequence('notes.init', [
	set(props`type`, 'notes'),
  oada.connect,
  set(state`notes.connection_id`, props`connection_id`),
	//	set(state`notes.loading`, true),
	//assumes oada has been initialized with a connection_id and valid token
  fetch,
  set(state`'notes.notes`, {}),
  set(props`oadaNotes`, state`oada.${state`notes.connection_id`}.bookmarks.notes.notes-index`),
	mapOadaToRecords,
  set(state`map.layers.Notes`, {visible: true}),
	getTagsList,
  set(state`notes.loading`, false),
  getNoteStats,
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
  toggle(state`notes.${props`type`}.${props`id`}.expanded`)
]);

export const cancelNoteButtonClicked = sequence('notes.cancelNoteButtonClicked', [
  set(state`app.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.${props`type`}.${props`id`}`)
])

export const toggleNoteDropdown = sequence('notes.toggleNoteDropdown', [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
]);

export const editNoteButtonClicked = sequence('notes.editNoteButtonClicked', [
  set(state`app.view.editing`, true),
	set(state`notes.selected_note.id`, props`id`),
	set(state`notes.selected_note.type`, props`type`),
  toggleNoteDropdown,
])

export const tagAdded = sequence('notes.tagAdded', [
  set(state`app.model.tag_input_text`, ''),
	addTagToNote, {
		error: [
			set(state`notes.${props`type`}.${props`id`}.tag_error`, props`message`),
      wait(2000), {
				continue: [
    			unset(state`notes.${props`type`}.${props`id`}.tag_error`),
				]
			}
		],
		success: [
	    addTagToAllTagsList, 
		]
	},
])

export const tagRemoved = sequence('notes.tagRemoved', [
  unset(state`notes.${props`type`}.${props`id`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
]);

export const noteListClicked = sequence('notes.noteListClicked', [
	unset(state`notes.selected_note`),
  set(state`app.view.editing`, false),
]);

export const exitNoteEditMode = sequence('notes.exitNoteDitMode', [
])

export const tabClicked = sequence('notes.tabClicked', [
  set(state`notes.tab`, props`tab`),
])

export const unwatchNote = sequence('notes.unwatchNote', [
])

export const deleteNoteButtonClicked = sequence('notes.deleteNoteButtonClicked', [
	set(props`note`, state`notes.${props`type`}.${props`id`}`),
	set(state`app.view.editing`, false),
	checkTags,
	({state, props}) => ({
    path: '/bookmarks/notes/notes-index/'+props.id,
    connection_id: state.get('notes.connection_id'),
	}),
	oada.delete,
	unwatchNote,
	unset(state`notes.selected_note`),
]);


export const noteTextChanged = sequence('notes.noteTextChanged', [
  set(state`notes.${props`type`}.${props`id`}.text`, props`value`)
]);

export const tagTextChanged = sequence('notes.tagTextChanged', [
	unset(state`notes.${props`type`}.${props`id`}.tag_error`),
  set(state`app.model.tag_input_text`, props`value`),
]);

export const createNewNote = sequence('notes.createNewNote', [
  createNote, 
  ({props, state}) => ({
    data: props.note,
    path: '/bookmarks/notes/notes-index/'+props.note.id,
    connection_id: state.get('notes.connection_id'),
    tree,
  }),
  oada.put,
  set(props`notes`, {[props`note.id`]: props`note`}),
])

export const showHideButtonClicked = sequence('notes.showHideButtonClicked', [
  changeShowHide, 
]);

export const noteClicked = sequence('notes.noteClicked', [
  ({state, props}) => ({geometry: state.get(`notes.${props.type}.${props.id}.geometry`)}),
  map.fitGeometry,
  when(state`app.view.editing`), {
    true: [],
		false: [
			set(state`notes.selected_note.id`, props`id`),
			set(state`notes.selected_note.type`, props`type`),
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

function handleNoteWatch({state, props}) {
  //if geohash is less than 6, take it
  //otherwise, check if the bucket is contained. 
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

function mapOadaToRecords({state, props}) {
  let connection_id = state.get('notes.connection_id');
  let notes = {};
	return Promise.map(Object.keys(props.oadaNotes || {}), (key) => {
		// ignore reserved keys used by oada
    if (key.charAt(0) !== '_') {
      state.set(`notes.notes.${key}`, state.get(`oada.${connection_id}.bookmarks.notes.notes-index.${key}`))
      notes[key] = props.oadaNotes[key];
    }
		return
  }).then(() => {
    return {notes}
  })
}

function getTagsList({state}) {
	let tags = {}
	let notes = state.get(`notes.notes`);
	return Promise.map(Object.keys(notes || {}), (key) => {
		return Promise.map(notes[key].tags || [], (tag) => {
			tags[tag] = tags[tag] || {text: tag, references: 0}
			tags[tag].references++
			return
		})
	}).then(() => {
		state.set(`app.model.tags`, tags)
		return
	})
}

function changeShowHide ({props, state}) {
  var geometryVisible = state.get(`notes.${props`type`}.${props.id}.geometry`, 'visible');
  if (geometryVisible) {
    state.set(`notes.${props`type`}.${props.id}.geometry.visible`, false);
  } else {
    state.set(`notes.${props`type`}.${props.id}.geometry.visible`, true);
  }
};

function createNote({props, state}) {
  var note = {
    created: Date.now(),
    id: uuid.v4(),
    text: '',
    tags: [],
    fields: {},
    geometry: { 
      visible: true,
    },
    color: rmc.getColor(),
  };
  note._id = 'resources/'+note.id;
	return { note }
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
  var allTags = state.get(`app.model.tags`);
	var noteTags = state.get(`notes.${props.type}.${props.id}.tags`);
	if (!noteTags) return
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(`app.model.tags`, tag); 
    }
  })
}

function addTagToNote({props, state, path}) {
	var tags = state.get(`notes.${props.type}.${props.id}.tags`);
	props.text = props.text.toLowerCase().trim();
	if (props.text === '') {
		return path.error({message: 'Tag text required'})
	} else if (tags.indexOf(props.text) > -1) {
		return path.error({message: 'Tag already applied'})
	} else {
		state.push(`notes.${props.type}.${props.id}.tags`, props.text);
		return path.success()
	}
};

function addTagToAllTagsList({props, state}) {
  var allTags = state.get(`app.model.tags`);
  if (!allTags[props.text]) {
    state.set(`app.model.tags.${props.text}`, { 
      text: props.text,
      references: 1
    });
  } else {
    state.set(`app.model.tags.${props.text}.references`, allTags[props.text].references+1);
  }
};

function removeTagFromAllTagsList({props, state}) {
  var refs = state.get(`app.model.tags.${props.tag}.references`);
  if (refs === 0) {
		state.unset(`app.model.tags.${props.tag}`);
  } else {
    state.set(`app.model.tags'.${props.tag}.references`, refs - 1);
  }
};

function mapFieldsToNotes({state, props}) {
  let fieldNotes = {};
  let notes = _.clone(state.get(`notes.fields`));
  if (props.fields) {
    console.log(props.fields);
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
              geometry: {
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
      if (notes[noteId].geometry && notes[noteId].geometry.geojson && notes[noteId].geometry.geojson.coordinates && notes[noteId].geometry.geojson.coordinates[0] && notes[noteId].geometry.geojson.coordinates[0].length > 3) {
        return Promise.map(Object.keys(fields), (fieldId) => {
          if (polygonsIntersect(fields[fieldId].geometry.geojson.coordinates[0], notes[noteId].geometry.geojson.coordinates[0])) {
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
		type: state.get('notes.selected_note.type'),
		id: state.get('notes.selected_note.id'),
	}),
  dropPoint, 
  map.updateGeometry, 
  set(state`notes.${props`type`}.${props`id`}.geometry`, props`geometry`),
])

function dropPoint ({props, state}) {
  let geometry = state.get(`notes.${props.type}.${props.id}.geometry`);
	if (geometry && geometry.geojson) {
    geometry.geojson.coordinates[0].push(props.pt);
  } else {
		geometry = {
      geojson: {
				type: "Polygon",
				coordinates: [[props.pt]]
			}
		};
	}
	state.set(`notes.${props.type}.${props.id}.geometry`, geometry);
	return {
		geometry
	}
}

export let markerDragged = sequence('notes.markerDragged', [
  set(state`notes.${props`type`}.${props`id`}.geometry.geojson.coordinates.0.${props`idx`}.0`, props`lng`),
  set(state`notes.${props`type`}.${props`id`}.geometry.geojson.coordinates.0.${props`idx`}.1`, props`lat`),
  map.updateGeometry,
  set(state`notes.${props`type`}.${props`id`}.geometry`, props`geometry`),
]);

export const undo = sequence('notes.undo', [
  when(state`notes.${props`type`}.${props`id`}.geometry.geojson.coordinates.0`), {
    true: [
      pop(state`notes.${props`type`}.${props`id`}.geometry.geojson.coordinates.0`),
    ],
    false: [],
  },
    /*  ({state,props,oada}) => {
    let points = state.get(`notes.${props.type}.${props.id}.geometry.geojson.coordinates.0`);
    if (points.length > 0) {
      state.pop(`notes.${props.type}.${props.id}.geometry.geojson.coordinates.0`);
    }
  },*/
  map.updateGeometry,
	set(state`notes.${props`type`}.${props`id`}.geometry`, props.geometry),
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
      createNewNote,
      set(props`type`, 'notes'),
    ],

    1: [
      fields.createNewField,
      set(props`type`, 'fields'),
      set(props`fields`, {[props`field.name`]: props`field`}),
      mapFieldsToNotes,
      set(state`notes.fields`, props`notes`),
      getNoteStats
    ],

    2: [],
	},
	set(state`notes.selected_note.id`, props`note.id`),
	set(state`notes.selected_note.type`, props`type`),
	set(state`app.view.editing`, true),
])

export const updateYieldStatsGeohashes = sequence('notes.updateYieldStatsGeohashes', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var body = props.response.change.body;
    var notes = {};
    console.log('update', body)
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      console.log('update crop', crop)
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        console.log('update ghLength', ghLength)
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
          console.log('updateYieldStats', geohash)
          // If that geohash belongs to a particular note, recalulate stats
          // If it hasn't been watched, setup the link(!!!) The watch is already established
          var stateNotes = state.get('notes.notes')
          return Promise.map(Object.keys(stateNotes || {}), (id) => {
            if (stateNotes[id]['yield-stats'].geohashes[geohash] ) {
              notes[id] = stateNotes[id];
              if (stateNotes[id]['yield-stats'].geohashes[geohash]._id) {
                return oada.put({
                  path: `/bookmarks/notes/notes-index/${id}/yield-stats/geohashes/${geohash}/${crop}/bucket`,
                  data: {
                    _id: body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'][geohash]._id,
                    _rev: '0-0'
                  },
                  connection_id,
                })
              } else return
            } else return
          })
        })
			})
		}).then(() => {
      return {notes}
    })
  },

  getNoteStats,
])

export const incrementalUpdateYieldStats = sequence('notes.incrementalUpdateYieldStats', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var body = props.response.change.body;
    console.log('update', body)
    return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
      console.log('update crop', crop)
      return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
        console.log('update ghLength', ghLength)
        return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
            return Promise.map(Object.keys(props.notes || {}), (id) => {
              if (props.notes[id]['yield-stats'].geohashes[geohash] ) {
                if (props.notes[id]['yield-stats'].geohashes[geohash].aggregates) {
                  return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'][geohash]['geohash-data'] || {}), (aggregate) => {
                    if (props.notes[id]['yield-stats'].geohashes[geohash].aggregates[aggregate]) {
                      var stats = harvest.recomputeStats();
                    } else return
                  })
                } else {

                }
              } else {

              }
            })
        })
			})
		}).then(() => {
      return
    })
  },

])

