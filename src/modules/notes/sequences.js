import { when, set, unset, toggle, wait } from 'cerebral/operators';
import { sequence } from 'cerebral'
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import * as yieldMod from '../yield/sequences.js';
//import * as fields from '../fields/sequences.js';
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
			}),
			oada.createResourceAndLink
		])
	}
])

export const oadaUpdateNote = [
	({props, state}) => ({
		data: props.note,
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/bookmarks/notes/'+props.note._id.replace(/^\/?resources\//, ''),
	}),
	oada.put,
]

export const getNoteStats = [
	set(state`notes.${props`type`}.${props`id`}.stats.computing`, true),
	({state, props}) => ({
		polygon:  state.get(`notes.${props`type`}.${props.id}.geometry.geojson.coordinates.0`),
		bbox: state.get(`notes.${props`type`}.${props.id}.geometry.bbox`),
	}),
	yieldMod.getPolygonStats,
	({state, props}) => ({note: state.get(`notes.${props`type`}.${props.id}`)}),
	unset(state`notes.${props`type`}.${props`id`}.stats.computing`),
]

export function getAllStats({state, props}) {
	let notes = state.get(`notes.${props.type}`);
	return Promise.map(Object.keys(notes || {}), (id) => {
		state.set(`notes.${props.type}.${id}.stats`, {computing:true})
		return {
			id,
			polygon: notes[id].geometry.geojson.coordinates[0],
			bbox: notes[id].geometry.bbox,
			type: props.type
		}
	}).then((polygons) => {
		return {polygons}
	})
}

export const drawComplete = [
	set(state`app.view.editing`, false), 
	oadaUpdateNote,
	getNoteStats
];

export const setAllNoteStats = [
	({state, props}) => {
		return Promise.map(props.polygons, (obj) => {
			state.set(`notes.${obj.type}.${obj.id}.stats`, obj.stats)
		})
	}
]

export const init = sequence('notes.init', [
	set(state`notes.loading`, true),
	//assumes oada has been initialized with a domain and valid token
	fetch,
	getTagsList,
	set(state`notes.loading`, false),
	set(props`type`, `notes`),
	getAllStats,
	yieldMod.getPolygonStats,
])

export const toggleComparisonsPane = [
  toggle(state`notes.${props`type`}.${props`id`}.expanded`)
]

export const cancelNote = [
  set(state`app.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.${props`type`}.${props`id`}`)
]

export const toggleNoteDropdown = [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
];

export const addTag = [
  set(state`app.model.tag_input_text`, ''),
	addTagToNote, {
		error: [
			set(state`notes.${props`type`}.${state`notes.selected_note`}.tag_error`, props`message`),
      wait(2000), {
				continue: [
    			unset(state`notes.${props`type`}.${state`notes.selected_note`}.tag_error`),
				]
			}
		],
		success: [
	    addTagToAllTagsList, 
		]
	},
];

export const removeTag = [
  unset(state`notes.${props`type`}.${state`notes.selected_note`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
];

export const handleNoteListClick = [
	unset(state`notes.selected_note`),
  set(state`app.view.editing`, false),
];

export const enterNoteEditMode = [
  set(state`app.view.editing`, true),
	set(state`notes.selected_note`, props`id`)
];

export const exitNoteEditMode = [
  set(state`app.view.editing`, false),
];

export const changeTab = [
  set(state`notes.tab`, props`tab`),
];

export const removeNote = [
	set(state`app.view.editing`, false),
	checkTags,
	({state, props}) => ({
		path: '/bookmarks/notes/'+state.get(`notes.${props`type`}.${props.id}._id`).replace(/^\/?resources\//, ''),
	}),
	oada.oadaDelete,
	fetch,
	unset(state`notes.selected_note`),
];

export const updateNoteText = [
  set(state`notes.${props`type`}.${props`id`}.text`, props`value`)
];

export const updateTagText = [
	unset(state`notes.${props`type`}.${state`notes.selected_note`}.tag_error`),
  set(state`app.model.tag_input_text`, props`value`),
];

export const addNewNote = [
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
	set(state`notes.selected_note`, props`note.id`),
	set(state`app.view.editing`, true),
];

export const changeShowHideState = [
  changeShowHide, 
];

export const handleNoteClick = [
	map.mapToNotePolygon,
  when(state`app.view.editing`), {
    true: [],
		false: [
			set(state`notes.selected_note`, props`id`)
    ],
  },
];

function computeStatsForNotes({state, props}) {

}

function mapOadaToRecords({state, props}) {
	state.set('notes.notes', {});
	let notes =  state.get('oada.bookmarks.notes');
	Object.keys(notes).forEach((key) => {
		// ignore reserved keys used by oada
		if (key.charAt(0) !== '_') state.set(`notes.notes.${notes[key].id}`, notes[key])
	})
}

function getTagsList({state}) {
	let tags = {}
	let notes = state.get(`notes.notes`);
	Object.keys(notes || {}).forEach((key) => {
		(notes[key].tags || []).forEach((tag) => {
			tags[tag] = tags[tag] || {text: tag, references: 0}
			tags[tag].references++
		})
	})
	state.set(`app.model.tags`, tags)
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
	return {note, uuid: note.id}
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
  var noteTags = state.get(`notes.notes.${props.id}.tags`);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(`app.model.tags`, tag); 
    }
  })
}

function addTagToNote({props, state, path}) {
	var id = state.get('notes.selected_note');
	var tags = state.get(`notes.notes.${id}.tags`);
	props.text = props.text.toLowerCase().trim();
	if (props.text === '') {
		return path.error({message: 'Tag text required'})
	} else if (tags.indexOf(props.text) > -1) {
		return path.error({message: 'Tag already applied'})
	} else {
		state.push(`notes.notes.${id}.tags`, props.text);
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


