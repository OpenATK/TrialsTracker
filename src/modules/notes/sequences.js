import { equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import { sequence } from 'cerebral'
import uuid from 'uuid';
import rmc from 'random-material-color';
import _ from 'lodash';
import Color from 'color';
import * as yieldMod from '../yield/sequences.js';
import * as map from '../map/sequences.js';
import {state, props } from 'cerebral/tags'
import * as oada from '../oada/sequences'

// TODO: Handle if oada isn't there (fails via token or lack of domain)

export const fetch = sequence('notes.fetch', [
	({props}) => ({
		path: '/bookmarks/notes',
		setupTree: {'*': {}},
	}),
	oada.fetchTree, 
	when(state`oada.bookmarks.notes`), {
		true: sequence('fetchNotesSuccess', [
			mapOadaToRecords,
		]),
		false: sequence('fetchNotesFailed', [
			({props}) => ({
				contentType: 'application/vnd.oada.yield.1+json',
				path: '/bookmarks/notes',
				data: {},
				uuid: uuid()
			}),
			oada.createResourceAndLink
		])
	}
])

export const oadaUpdateNote = [
	({props, state}) => ({
		data: props.note,
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/bookmarks/notes/'+props.note.id,
	}),
	oada.put,
]

export const getNoteStats = [
	set(state`notes.${props`type`}.${props`id`}.stats.computing`, true),
	({state, props}) => ({
		polygon:  state.get(`notes.${props.type}.${props.id}.geometry.geojson.coordinates.0`),
		bbox: state.get(`notes.${props.type}.${props.id}.geometry.bbox`),
	}),
	yieldMod.getPolygonStats,
	({state, props}) => ({note: state.get(`notes.${props.type}.${props.id}`)}),
	unset(state`notes.${props`type`}.${props`id`}.stats.computing`),
]

export function getAllStats({state, props}) {
	let notes = state.get(`notes.${props.type}`);
	return Promise.map(Object.keys(notes || {}), (id) => {
		//if (notes[id]._id) {
			state.set(`notes.${props.type}.${id}.stats`, {computing:true})
			let polygon;
			let bbox;
			if (notes[id].geometry && notes[id].geometry.geojson) {
				polygon = notes[id].geometry.geojson.coordinates[0];
				bbox = _.clone(notes[id].geometry.bbox);
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
		//}
		return
	}).then((polygons) => {
		polygons = polygons.filter((polygon) => (polygon) ? true: false);
		return {polygons}
	})
}

export const handleWatchUpdate = sequence('notes.handleWatchUpdate', [
	({state, props}) => {
	},
	fetch,
])

export const doneClicked = [
	set(props`type`, state`notes.selected_note.type`),
	set(props`id`, state`notes.selected_note.id`),
	set(props`note`, state`notes.${props`type`}.${props`id`}`),
	set(state`app.view.editing`, false), 
	getNoteStats,
	oadaUpdateNote,
];

export const init = sequence('notes.init', [
	set(state`notes.loading`, true),
	//assumes oada has been initialized with a domain and valid token
	fetch,
	getTagsList,
	set(state`notes.loading`, false),
	set(props`type`, `notes`),
	getAllStats,
	yieldMod.getPolygonStats,
	({state, props}) => ({
		watches: {
			[state.get('oada.bookmarks.notes._id')] : {
				path: '/bookmarks/notes',
				signalPath: 'notes.handleWatchUpdate'
			},
		},
	}),
	oada.registerWatch,
])

export const expandComparisonsClicked = [
  toggle(state`notes.${props`type`}.${props`id`}.expanded`)
]

export const cancelNoteButtonClicked = [
  set(state`app.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.${props`type`}.${props`id`}`)
]

export const toggleNoteDropdown = [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
];

export const editNoteButtonClicked = [
  set(state`app.view.editing`, true),
	set(state`notes.selected_note.id`, props`id`),
	set(state`notes.selected_note.type`, props`type`),
  toggleNoteDropdown,
]

export const tagAdded = [
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
];

export const tagRemoved = [
  unset(state`notes.${props`type`}.${props`id`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
];

export const noteListClicked = [
	unset(state`notes.selected_note`),
  set(state`app.view.editing`, false),
];

export const exitNoteEditMode = [
];

export const tabClicked = [
  set(state`notes.tab`, props`tab`),
];

export const unwatchNote = sequence('notes.unwatchNote', [
])

export const deleteNoteButtonClicked = [
	set(props`note`, state`notes.${props`type`}.${props`id`}`),
	set(state`app.view.editing`, false),
	checkTags,
	({state, props}) => ({
		path: '/bookmarks/notes/'+props.id,
	}),
	oada.oadaDelete,
	unwatchNote,
	fetch,
	unset(state`notes.selected_note`),
];


export const noteTextChanged = [
  set(state`notes.${props`type`}.${props`id`}.text`, props`value`)
];

export const tagTextChanged = [
	unset(state`notes.${props`type`}.${state`id`}.tag_error`),
  set(state`app.model.tag_input_text`, props`value`),
];

export const addNoteButtonClicked = [
//TODO: perhaps restrict whether a note can be added while another is editted
	unset(state`notes.selected_note`),
	createNote, 
	({props, state}) => ({
		data: props.note,
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/bookmarks/notes',
		linkToId: true
	}),
	oada.createResourceAndLink,
	fetch,
	equals(state`notes.tab`), {
		0: [set(props`type`, 'notes')],
		1: [set(props`type`, 'fields')],
		2: [],
	},
	set(state`notes.selected_note.id`, props`note.id`),
	set(state`notes.selected_note.type`, props`type`),
	set(state`app.view.editing`, true),
];

export const showHideButtonClicked = [
  changeShowHide, 
];

export const noteClicked = [
	map.mapToNotePolygon,
  when(state`app.view.editing`), {
    true: [],
		false: [
			set(state`notes.selected_note.id`, props`id`),
			set(state`notes.selected_note.type`, props`type`),
    ],
  },
];

function computeStatsForNotes({state, props}) {

}

function mapOadaToRecords({state, props}) {
	state.set('map.layers.Notes', {visible: true});
	state.set('notes.notes', {});
	let notes =  state.get('oada.bookmarks.notes');
	console.log(JSON.stringify(notes))
	return Promise.map(Object.keys(notes || {}), (key) => {
		// ignore reserved keys used by oada
		if (key.charAt(0) !== '_') state.set(`notes.notes.${key}`, notes[key])
		return
	}).then(() => { return})
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
    completions: [],
    stats: {},
  };
  note.font_color = getFontColor(note.color);
	return {id: note.id, note, uuid: note.id}
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
