import { equals, when, set, unset, toggle, wait } from 'cerebral/operators';
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import yieldDataStatsForPolygon from '../Yield/utils/yieldDataStatsForPolygon';
import getFieldDataForNotes from '../Fields/actions/getFieldDataForNotes';
import setFieldDataForNotes from '../Fields/actions/setFieldDataForNotes';
import _ from 'lodash';
import {state, props, } from 'cerebral/tags'

export var toggleComparisonsPane = [
  toggle(state`${props`path`}.expanded`)
]

export var initialize = [
  
]

export var cancelNote = [
  set(state`App.view.editing`, false),
  unset(state`Note.selected_note`),
  unset(state`Note.notes.${props`id`}`)
]

export var toggleNoteDropdown = [
  set(state`App.view.note_dropdown.note`, props`id`),
  toggle(state`App.view.note_dropdown.visible`),
];

export var addTag = [
  set(state`App.model.tag_input_text`, ''),
	addTagToNote, {
		error: [
			set(state`Note.notes.${state`Note.selected_note`}.tag_error`, props`message`),
      wait(2000), {
				continue: [
    			unset(state`Note.notes.${state`Note.selected_note`}.tag_error`),
				]
			}
		],
		success: [
	    addTagToAllTagsList, 
		]
	},
];

export var removeTag = [
  unset(state`Note.notes.${state`Note.selected_note`}.tags.${props`idx`}`),
	removeTagFromAllTagsList,
];

export var deselectNote = [
  when(state`Note.selected_note`), {
		true: [
			set(state`Note.notes.${state`Note.selected_note`}.selected`, false),
			unset(state`Note.selected_note`),
		],
		false: [],
	},
];

export var selectNote = [
	when(state`Note.selected_note`), {
		true: [toggle(state`Note.notes.${state`Note.selected_note`}.selected`),],
		false: [],
	},
  toggle(state`Note.notes.${props`id`}.selected`),
	set(state`Note.selected_note`, props`id`)
]

export let drawComplete = [
	set(state`App.view.editing`, false), 
	set(state`Note.notes.${props`id`}.stats.computing`, true),
  computeNoteStats, {
    success: [
			setNoteStats, 
      set(state`Map.geohashPolygons`, props`geohashPolygons`),
			set(props`notes.${props`id`}`, state`Note.notes.${props`id`}`),
      getFieldDataForNotes, {
        success: [setFieldDataForNotes],
        error: [],
      }
    ],
		error: [
      unset(state`Note.notes.${props`id`}.stats.computing`)
  	],
  },
];

export var handleNoteListClick = [
  ...deselectNote, 
  set(state`App.view.editing`, false),
];

export var enterNoteEditMode = [
  set(state`App.view.editing`, true),
  ...selectNote,
];

export var exitNoteEditMode = [
  set(state`App.view.editing`, false),
];

export var changeSortMode = [
  set(state`App.view.sort_mode`, props`newSortMode`),
];

export var removeNote = [
	set(state`App.view.editing`, false),
	equals(state`Note.selected_note`), {
		[props`id`]: deselectNote,
		otherwise: []
	},
  checkTags, 
  deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
	unset(state`Note.notes.${state`Note.selected_note`}.tag_error`),
  set(state`App.model.tag_input_text`, props`value`),
];

export var addNewNote = [
//TODO: perhaps restrict whether a note can be added while another is editted
  ...deselectNote,
	createNote, 
  set(state`App.view.editing`, true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleNoteClick = [
	mapToNotePolygon,
  when(state`App.view.editing`), {
    true: [],
		false: [
      ...selectNote, 
    ],
  },
];

function computeNoteStats({props, state, path}) {
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
	let availableGeohashes = state.get('Yield.data_index');
  let geometry = state.get(`Note.notes.${props.id}.geometry`);
  return yieldDataStatsForPolygon(geometry.geojson.coordinates[0], geometry.bbox, availableGeohashes, domain, token)
  .then((data) => {
    return path.success({geohashPolygons: data.geohashPolygons, stats: data.stats, ids:[props.id]});
  })
}

function setNoteStats({props, state}) {
	Object.keys(props.stats).forEach((crop) => {
    state.set(`Note.notes.${props.id}.stats`, props.stats);
  })
  state.unset(`Note.notes.${props.id}.stats.computing`);
}

function mapToNotePolygon({props, state}) {
  var note = state.get(`Note.notes.${props.id}`);
  if (note) state.set('Map.center', note.geometry.centroid);
}

function changeShowHide ({props, state}) {
  var geometryVisible = state.get(`Note.notes.${props.id}.geometry`, 'visible');
  if (geometryVisible) {
    state.set(`Note.notes.${props.id}.geometry.visible`, false);
  } else {
    state.set(`Note.notes.${props.id}.geometry.visible`, true);
  }
};

function setNoteText ({props, state}) {
  state.set(`Note.notes.${props.id}.text`, props.value);
};

function createNote({props, state}) {
  var notes = state.get(`Note.notes`);
	Object.keys(notes).forEach((note) => {
    state.set(`Note.notes.${note}.order`, notes[note].order +1);
  })

  var newNote = {
    time: Date.now(),
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
    selected: true,
    stats: {},
    order: 0,
  };
  newNote.font_color = getFontColor(newNote.color);
  state.set(`Note.notes.${newNote.id}`, newNote);
  state.set('Note.selected_note', newNote.id);
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
  var allTags = state.get(['App', 'model', 'tags']);
  var noteTags = state.get(`Note.notes.${props.id}.tags`);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['App', 'model', 'tags', tag]); 
    }
  })
}

function deleteNote({props, state}) {
  state.unset(`Note.notes.${props.id}`); 
  var notes = state.get('Note.notes');
	Object.keys(notes).forEach((id) => {
    if (notes[id].order > props.id) {
      state.set(`Note.notes.${id}.order`, notes[id].order);
    }
  })
};

function addTagToNote({props, state, path}) {
	var id = state.get('Note.selected_note');
	var tags = state.get(`Note.notes.${id}.tags`);
	props.text = props.text.toLowerCase();
	if (props.text === '') {
		return path.error({message: 'Tag text required'})
	} else if (tags.indexOf(props.text) > -1) {
		return path.error({message: 'Tag already applied'})
	} else {
		state.push(`Note.notes.${id}.tags`, props.text);
		return path.success()
	}
};

function addTagToAllTagsList({props, state}) {
  var allTags = state.get(['App', 'model', 'tags']);
  if (!allTags[props.text]) {
    state.set(['App', 'model', 'tags', props.text], { 
      text: props.text,
      references: 1
    });
  } else {
    state.set(['App', 'model', 'tags', props.text, 'references'], allTags[props.text].references+1);
  }
};

function removeTagFromAllTagsList({props, state}) {
  var refs = state.get(['App', 'model', 'tags', props.tag, 'references']);
  if (refs === 0) {
    state.unset(['App', 'model', 'tags', props.tag]);
  } else {
    state.set(['App', 'model', 'tags', props.tag, 'references'], refs - 1);
  }
};

