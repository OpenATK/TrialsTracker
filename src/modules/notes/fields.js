import computeBoundingBox from '../map/utils/computeBoundingBox';
import gjArea from '@mapbox/geojson-area';
import { sequence } from 'cerebral'
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import * as fields from '@oada/fields-module/sequences';
import * as yieldMod from '../yield/sequences.js';
import * as map from '../map/sequences.js';
import { state, props } from 'cerebral/tags'
import oadaMod from '@oada/cerebral-module/sequences'
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
      return {requests, concurrency: 1}
    })
  },
  oadaMod.put,
]);
/*
export const createFieldNotes = sequence('notes.createYieldeldNotes', [
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
])
*/

export const checkFieldNotes = sequence('notes.checkFieldsNotes', [
  findNewFields,
  createFieldNotes,
  ({props}) => ({notes: {['fields']: props.fieldNotes}}),
])

//Check that a note exists for each field. If not, create it.
function findNewFields({state, props}) {
  let fieldNotes = state.get('notes.fields') || {};
  var connection_id = state.get('fields.connection_id');
  let oadaFields = state.get(`oada.${connection_id}.bookmarks.fields`) || {};
  var newNotes = {};
  return Promise.map(Object.keys(oadaFields['fields-index'] || {}), (farmName) => {
    if (oadaFields['fields-index'][farmName]) {
      return Promise.map(Object.keys(oadaFields['fields-index'][farmName]['fields-index'] || {}), (fieldName) => {
        let field = oadaFields['fields-index'][farmName]['fields-index'][fieldName];
        var id = field._id.replace(/^resources\//, '');
        console.log(fieldName, Object.keys(fieldNotes).some(key => key == id))
        if (!Object.keys(fieldNotes).some(key => key == id)) {
          console.log(fieldName);
          console.log(oadaFields);
          console.log(fieldNotes);
          newNotes[id] = {
            created: Date.now(),
            id,
            text: farmName+' - '+fieldName,
            tags: [],
            field: {
              _id: field._id,
              _rev: field._rev,
            },
            color: rmc.getColor(),
          }
          if (field.boundary) {
            let bbox = computeBoundingBox(field.boundary.geojson);           
            newNotes[id].boundary = {
              geojson: field.boundary.geojson,
              centroid:[
                (bbox.north + bbox.south)/2, 
                (bbox.east + bbox.west)/2
              ],
              visible: true,
              bbox,
              area: gjArea.geometry(field.boundary.geojson)/4046.86,
            };
          }
        }
        return
      })
    }
  }).then(() => {
    return {fieldNotes:newNotes}
  })
}

