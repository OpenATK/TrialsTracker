import polygonsIntersect from '../map/utils/polygonsIntersect';
import rmc from 'random-material-color'
import gaussian from 'gaussian';
import { sequence } from 'cerebral'
import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import Promise from 'bluebird';
import computeBoundingBox from '../map/utils/computeBoundingBox'
import * as yieldMod from '../yield/sequences.js';
import gjArea from '@mapbox/geojson-area';
import * as oada from '../oada/sequences'
import * as notes from '../notes/sequences'

//TODO: create transform from field to notes.fields entry
//TODO: need a string that says "loading fields"

let setupTree = {
	'_type': "application/vnd.oada.fields.1+json",
	'_rev': '0-0',
	'fields-index': {
		'*': {
			'_type': "application/vnd.oada.fields.1+json",
			'_rev': '0-0',
			'fields-index': {
				'*': {
					'_type': "application/vnd.oada.field.1+json"
				}
			}
		}
	}
}

export const fetch = sequence('fields.fetch', [
	({state, props}) => ({
		setupTree,
		path: '/bookmarks/fields',
	}),
	oada.fetchTree,
	when(state`oada.bookmarks.fields`), {
		true: sequence('fetchFieldsSuccess', [
			mapOadaToFields,
			mapFieldsToNotes,
		]),
		false: sequence('fetchFieldsFailed', []),
	},
])

export const init = sequence('fields.init', [
	set(state`fields.loading`, true),
	fetch,
	set(state`fields.loading`, false),
	set(props`type`, 'fields'),
	notes.getAllStats,
	yieldMod.getPolygonStats,
])

export const selectField = [];

function mapFieldsToNotes({state, props}) {
	let fields = state.get('fields.records');
	let notes = {};
	return Promise.map(Object.keys(fields || {}), (key) => {
	let bbox = computeBoundingBox(fields[key].boundary.geojson);           
		return notes[key] = {
			created: Date.now(),
			id: key,
			text: key,
			tags: [],
			fields: {},
			geometry: {
				geojson: fields[key].boundary.geojson,
				centroid:[
					(bbox.north + bbox.south)/2, 
					(bbox.east + bbox.west)/2
				],
				visible: true,
				bbox,
				area: gjArea.geometry(fields[key].boundary.geojson)/4046.86,
			},
			color: rmc.getColor(),
			completions: [],
			stats: {},
		};
	}).then(() => {
		state.set(`notes.fields`, notes)
		return
	})
}

let dist = gaussian(0,1);
export function getFieldDataForNotes({props, state, path}) {
	var notes = props.notes;
  var fields = state.get('fields.records');
  if (fields && props.notes) {
		var noteFields = {};
    return Promise.map(Object.keys(props.notes), (noteId) => {
      noteFields[noteId] = {};
			return Promise.map(Object.keys(fields), (fieldId) => {
        if (notes[noteId].geometry.geojson.coordinates[0].length > 3) {
          if (polygonsIntersect(fields[fieldId].boundary.geojson.coordinates[0], notes[noteId].geometry.geojson.coordinates[0])) {
            if (fields[fieldId].stats) {
							noteFields[noteId][fieldId] = {};
              return Promise.map(Object.keys(fields[fieldId].stats), (crop) => {
								if (notes[noteId].stats[crop]) {
									let fieldStats = fields[fieldId].stats[crop];
									let noteStats = notes[noteId].stats[crop];
									noteFields[noteId][fieldId][crop] = {
										comparison: {
										  differenceMeans: fieldStats.yield.mean - noteStats.yield.mean,
										  standardError: fieldStats.yield.standardDeviation/Math.pow(noteStats.count, 0.5),
									  }
									}
									noteFields[noteId][fieldId][crop].comparison.zScore = (noteStats.yield.mean - fieldStats.yield.mean)/noteFields[noteId][fieldId][crop].comparison.standardError;
									noteFields[noteId][fieldId][crop].comparison.pValue = noteFields[noteId][fieldId][crop].comparison.zScore > 0 ? 2*(1 - dist.cdf(noteFields[noteId][fieldId][crop].comparison.zScore)) : 2*(dist.cdf(noteFields[noteId][fieldId][crop].comparison.zScore))
									noteFields[noteId][fieldId][crop].comparison.signficantDifference = noteFields[noteId][fieldId][crop].comparison.pValue < 0.05;
                  return true;
                } else return false;
              })
            } else return false;
          } else return false;
        } else return false;
      })
    }).then((result) => {
      return path.success({noteFields});
		}).catch((error) => {
			console.log(error)
      return path.error(error);
		})
  } else return path.error({});
}

export function mapOadaToFields({props, state}) {
	let fields = state.get('oada.bookmarks.fields')
	if (fields) {
		return Promise.map(Object.keys(fields['fields-index'] || {}), (fieldGroup) => {
		  return Promise.map(Object.keys(fields['fields-index'][fieldGroup]['fields-index'] || {}), (field) => {
			  return state.set(`fields.records.${field}`, { 
			  	boundary: fields['fields-index'][fieldGroup]['fields-index'][field].boundary,
			  	id: field,
			  });
      })
		}).then(() => {
			state.set('map.layers.Fields', {visible: true});
			return
		})
  }
}

export function setFieldDataForNotes({props, state}) {
  if (props.noteFields) {
    Object.keys(props.noteFields).forEach((id) => {
      state.set(`notes.notes.${id}.fields`, {});
      Object.keys(props.noteFields[id]).forEach((fieldId) => {
        state.set(`notes.notes.${id}.fields.${fieldId}`, props.noteFields[id][fieldId]);
      })
    })
  }
}
