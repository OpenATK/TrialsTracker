import polygonsIntersect from '../map/utils/polygonsIntersect';
import rmc from 'random-material-color'
import gaussian from 'gaussian';
import { sequence } from 'cerebral'
import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import Promise from 'bluebird';
import computeBoundingBox from '../map/utils/computeBoundingBox'
import {getPolygonStats, polygonToGeohashes } from '../yield/sequences.js';
import gjArea from '@mapbox/geojson-area';
import * as oada from '../oada/sequences'
import * as notes from '../notes/sequences'

//TODO: create transform from field to notes.fields entry

let setupTree = {
	//	'_type': "application/vnd.oada.fields.1+json",
	'fields-index': {
		'*': {
			//			'_type': "application/vnd.oada.field.1+json",
			'fields-index': {
				'*': {
					//					'_type': "application/vnd.oada.field.1+json"
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
			set(state`notes.fields`, props`notes`),
		]),
		false: sequence('fetchFieldsFailed', []),
	},
])

console.log('before fields init', getPolygonStats)
export const init = sequence('fields.init', [
	set(state`fields.loading`, true),
	fetch,
	set(state`fields.loading`, false),
	set(props`type`, 'fields'),
	notes.getAllStats,
	getPolygonStats,
])
console.log('after fields init', getPolygonStats)

export const selectField = [];

//export const mapFieldsToNotes = sequence('fields.mapFieldsToNotes', [
//	({state, props}) => {
function mapFieldsToNotes({state, props}) {
		let fields = state.get('fields.records');
		let notes = {};
		return Promise.map(Object.keys(fields || {}), (key) => {
			return notes[key] = {
				created: Date.now(),
				id: key,
				text: key,
				tags: [],
				fields: {},
				geometry: {
					geojson: fields[key].boundary.geojson,
					bbox: {},
					centroid: [],
					visible: true,
					bbox: computeBoundingBox(fields[key].boundary.geojson),
					area: gjArea.geometry(fields[key].boundary.geojson)/4046.86,
				},
				color: rmc.getColor(),
				completions: [],
				stats: {},
			};
		}).then(() => {
			return {notes}
		})
}
//	set(state`notes.fields`, props`notes`)
//])

export function getFieldStats({state, path}) {
  let fields = state.get('fields.records');
  let availableGeohashes = state.get('yield.index');
  if (!(fields && availableGeohashes)) return path.error({});
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
	let stats = {};
	return Promise.map(Object.keys(fields || {}), (field, idx) => {
		return polygonToGeohashes(fields[field].boundary.geojson.coordinates[0], fields[field].boundary.bbox, availableGeohashes, domain, token).then((fieldStats) => {
      stats[field] = fieldStats.stats;
      return stats;
    })
  }).then((res) => { 
    return path.success({stats});
  }).catch((error) => {
    console.log(error);
    return path.error({error})
  })
}

export function getFieldBoundingBoxes({props, state, path}) {
  var bboxes = {};
	var areas = {};
  return Promise.map(Object.keys(props.fields['fields-index']), (fieldGroup) => {
    return Promise.map(Object.keys(props.fields['fields-index'][fieldGroup]['fields-index']), (field) => {
			bboxes[field] = computeBoundingBox(props.fields['fields-index'][fieldGroup]['fields-index'][field].boundary.geojson);
			areas[field] = gjArea.geometry(props.fields['fields-index'][fieldGroup]['fields-index'][field].boundary.geojson)/4046.86;
		})
  }).then((result) => {
    return path.success({bboxes, areas})
  }).catch((err) => {
    return path.error({err});
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
		Object.keys(fields['fields-index']).forEach((fieldGroup) => {
		  Object.keys(fields['fields-index'][fieldGroup]['fields-index']).forEach((field) => {
			  state.set(`fields.records.${field}`, { 
			  	boundary: fields['fields-index'][fieldGroup]['fields-index'][field].boundary,
			  	id: field,
			  });
      })
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

export function setFieldBoundingBoxes({props, state}) {
//TODO: need to check for valid data source
  Object.keys(props.bboxes).forEach((field) => {
    state.set(`fields.records.${field}.boundary.area`, props.areas[field]);
    state.set(`fields.records.${field}.boundary.bbox`, props.bboxes[field]);
    state.set(`fields.records..${field}.boundary.centroid`, [(props.bboxes[field].north + props.bboxes[field].south)/2, (props.bboxes[field].east + props.bboxes[field].west)/2]);
  })
}

export function setFieldStats({props, state}) {
	if (props.stats) {
    Object.keys(props.stats).forEach((field) => {
      Object.keys(props.stats[field]).forEach((crop) => {
        state.set(`fields.records.${field}.stats.${crop}`, props.stats[field][crop]);
      })
		})
	}
}
