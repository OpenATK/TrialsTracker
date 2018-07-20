import { sequence } from 'cerebral'
import { set, when } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import Promise from 'bluebird';
import * as oada from '@oada/cerebral-module/sequences'

//TODO: create transform from field to notes.fields entry
//TODO: need a string that says "loading fields"

let tree = {
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
    connection_id: state.get('fields.connection_id'),
		tree,
    path: '/bookmarks/fields',
    //    watch: true,
	}),
	oada.get,
  mapOadaToFields,
])

export const init = sequence('fields.init', [
  set(state`fields.connection_id`, props`connection_id`),
  oada.connect,
	set(state`fields.loading`, true),
	fetch,
	set(state`fields.loading`, false),
	set(props`type`, 'fields'),
])

export const selectField = sequence('fields.selectField', []);

function mapOadaToFields({props, state}) {
  let id = state.get('fields.connection_id');
	let fields = state.get(`oada.${id}.bookmarks.fields`)
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
