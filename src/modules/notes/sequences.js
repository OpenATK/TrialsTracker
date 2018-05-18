import { equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import computeBoundingBox from '../map/utils/computeBoundingBox.js'
import { sequence } from 'cerebral'
import gh from 'ngeohash'
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import * as yieldMod from '../yield/sequences.js';
import * as fields from '../fields/sequences.js';
import * as map from '../map/sequences.js';
import _ from 'lodash';
import {state, props } from 'cerebral/tags'
import geohashNoteIndexManager from '../yield/utils/geohashNoteIndexManager.js';
import oadaCache from '../oada/factories/cache';
import * as oada from '../oada/sequences'
let cache = oadaCache(null, 'oada');

//TODO: Should the DELETE operation follow with a GET to propagate it back to
// the cerebral state?
//
//

export const fetch = sequence('oada.fetch', [
	({props}) => ({
		path: '/bookmarks/notes',
		setupTree: {
			'*': {
			}
		},
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
				linkToId: false,
			}),
			oada.createResourceAndLink
		])
	}
])

export const init = sequence('notes.init', [
	//assumes oada has been initialized with a domain and valid token
	fetch,
	getTagsList
])



export var toggleComparisonsPane = [
  toggle(state`notes.${props`type`}.${props`id`}.expanded`)
]

export var cancelNote = [
  set(state`app.view.editing`, false),
  unset(state`notes.selected_note`),
  unset(state`notes.notes.${props`id`}`)
]

export var oadaUpdateNote = [
	({props, state}) => ({
		data: props.note,
		contentType: 'application/vnd.oada.yield.1+json',
		path: '/bookmarks/notes/'+props.note._id.replace(/^\/?resources\//, ''),
	}),
	oada.put,
]

export var toggleNoteDropdown = [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
];

export var addTag = [
  set(state`app.model.tag_input_text`, ''),
	addTagToNote, {
		error: [
			set(state`notes.notes.${state`notes.selected_note`}.tag_error`, props`message`),
      wait(2000), {
				continue: [
    			unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
				]
			}
		],
		success: [
	    addTagToAllTagsList, 
		]
	},
];

export var removeTag = [
  unset(state`notes.notes.${state`notes.selected_note`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
];

export let drawComplete = [
	set(state`app.view.editing`, false), 
	set(state`notes.notes.${props`id`}.stats.computing`, true),
	set(props`geometry`, state`notes.notes.${props`id`}.geometry`),
	set(props`polygon`, state`notes.notes.${props`id`}.geometry.geojson.coordinates.0`),
	set(props`bbox`, state`notes.notes.${props`id`}.geometry.bbox`),
	yieldMod.getNoteStats,
	set(props`notes.${props`id`}`, state`notes.notes.${props`id`}`),
	set(props`note`, state`notes.notes.${props`id`}`),
	oadaUpdateNote,
	unset(state`notes.notes.${props`id`}.stats.computing`)
];

export var handleNoteListClick = [
	unset(state`notes.selected_note`),
  set(state`app.view.editing`, false),
];

export var enterNoteEditMode = [
  set(state`app.view.editing`, true),
	set(state`notes.selected_note`, props`id`)
];

export var exitNoteEditMode = [
  set(state`app.view.editing`, false),
];

export var changeTab = [
  set(state`notes.tab`, props`tab`),
];

export var removeNote = [
	set(state`app.view.editing`, false),
	checkTags,
	({state, props}) => ({
		path: '/bookmarks/notes/'+state.get(`notes.notes.${props.id}._id`).replace(/^\/?resources\//, ''),
	}),
	oada.oadaDelete,
	unset(state`notes.selected_note`),
	mapOadaToRecords,
	//  unset(state`notes.notes.${props`id`}`),
];

export var updateNoteText = [
  set(state`notes.notes.${props`id`}.text`, props`value`)
];

export var updateTagText = [
	unset(state`notes.notes.${state`notes.selected_note`}.tag_error`),
  set(state`app.model.tag_input_text`, props`value`),
];

export var addNewNote = [
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
	mapOadaToRecords,
	set(state`notes.selected_note`, props`note.id`),
	set(state`app.view.editing`, true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleNoteClick = [
	map.mapToNotePolygon,
  when(state`app.view.editing`), {
    true: [],
		false: [
			set(state`notes.selected_note`, props`id`)
    ],
  },
];

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
	Object.keys(notes).forEach((key) => {
		notes[key].tags.forEach((tag) => {
			tags[tag] = tags[tag] || {text: tag, references: 0}
			tags[tag].references++
		})
	})
	state.set(`app.model.tags`, tags)
}

function changeShowHide ({props, state}) {
  var geometryVisible = state.get(`notes.notes.${props.id}.geometry`, 'visible');
  if (geometryVisible) {
    state.set(`notes.notes.${props.id}.geometry.visible`, false);
  } else {
    state.set(`notes.notes.${props.id}.geometry.visible`, true);
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
    stats: {},
  };
  note.font_color = getFontColor(note.color);
	return {note}
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


