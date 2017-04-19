import { set, unset, toggle } from 'cerebral/operators';
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import _ from 'lodash';
import {state, props } from 'cerebral/tags'

export var cancelNote = [
  set(state`app.view.editing_note`, false),
  unset(state`app.view.selected_note`),
  unset(`state:app.model.notes.$id`)
]

export var toggleNoteDropdown = [
  set(state`app.view.note_dropdown.note`, props`id`),
  toggle(state`app.view.note_dropdown.visible`),
];

export var addTag = [
  addTagToNote, addTagToAllTagsList, 
  set(state`app.model.tag_input_text`, ''),
];

export var removeTag = [
  removeTagFromNote, removeTagFromAllTagsList,
];

export var handleNoteListClick = [
  deselectNote, 
  set(state`app.view.editing_note`, false),
];

export var enterNoteEditMode = [
  set(state`app.view.editing_note`, true),
  selectNote,
];

export var exitNoteEditMode = [
  set(state`app.view.editing_note`, false),
];

export var changeSortMode = [
  set(state`app.view.sort_mode`, props`newSortMode`),
];

export var removeNote = [
  set(state`app.view.editing_note`, false),
  deselectNote,
  checkTags, 
  deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
  set(state`app.model.tag_input_text`, props`value`),
];

export var addNewNote = [
  deselectNote,
  createNote, 
  set(state`app.view.editing_note`, true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleNoteClick = [
  mapToNotePolygon,
  isDrawing, {
    true: [],
    false: [
      deselectNote, 
      set(state`app.view.editing_note`, false),
      selectNote, 
    ],
  },
];

function isDrawing ({props, state, path}) {
  if (state.get('app.view.editing_note')) {
    return path.true({})
  } else return path.false({})
}
isDrawing.outputs = ['true', 'false'];

function mapToNotePolygon({props, state}) {
  var note = state.get(`app.model.notes.${props.id}`);
  if (note) state.set(['app', 'view', 'map', 'map_location'], note.geometry.centroid);
}

function deselectNote ({props, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  if (!_.isEmpty(note)) state.set(['app', 'model', 'notes', note, 'selected'], false);
  state.unset(['app', 'view', 'selected_note']);
};

function changeShowHide ({props, state}) {
  var geometryVisible = state.get(['app', 'model', 'notes', props.id, 'geometry', 'visible']);
  if (geometryVisible) {
    state.set(['app', 'model', 'notes', props.id, 'geometry', 'visible'], false);
  } else {
    state.set(['app', 'model', 'notes', props.id, 'geometry', 'visible'], true);
  }
};

function setNoteText ({props, state}) {
  state.set(['app', 'model', 'notes', props.id, 'text'], props.value);
};

function selectNote ({props, state}) {
  //check that the selected note isn't already selected
  if (state.get(['app', 'view', 'selected_note']) !== props.id) {
    // set the status of the currently selected note to "unselected"
    if (!_.isEmpty(state.get(['app', 'view', 'selected_note']))) {
      state.set(['app', 'model', 'notes', state.get(['app', 'view', 'selected_note']), 'selected'], false);
    }
    state.set(['app', 'view', 'selected_note'], props.id);
    state.set(['app', 'model', 'notes', props.id, 'selected'], true);
  }
};

function createNote({props, state}) {
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    state.set(['app', 'model', 'notes', note, 'order'], notes[note].order +1);
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
    order: 1,
  };
  newNote.font_color = getFontColor(newNote.color);
  state.set(['app', 'model', 'notes', newNote.id], newNote);
  state.set(['app', 'view', 'selected_note'], newNote.id);
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
  var allTags = state.get(['app', 'model', 'tags']);
  var noteTags = state.get(['app', 'model', 'notes', props.id, 'tags']);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  })
}

function deleteNote({props, state}) {
  state.unset(['app', 'model', 'notes', props.id]); 
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    if (notes[note].order > props.id) {
      state.set(['app', 'model', 'notes', note, 'order'], notes[note].order);
    }
  })
};

function addTagToNote({props, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  state.concat(['app', 'model', 'notes', note, 'tags'], props.text);
};

function removeTagFromNote({props, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  var tags = state.get(['app', 'model', 'notes', note, 'tags']);
  var idx = tags.indexOf(props.tag);
  state.splice(['app', 'model', 'notes', note, 'tags'], idx, 1);
};

function addTagToAllTagsList({props, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  if (!allTags[props.text]) {
    state.set(['app', 'model', 'tags', props.text], { 
      text: props.text,
      references: 1
    });
  } else {
    state.set(['app', 'model', 'tags', props.text, 'references'], allTags[props.text].references+1);
  }
};

function removeTagFromAllTagsList({props, state}) {
  var refs = state.get(['app', 'model', 'tags', props.tag, 'references']);
  if (refs === 0) {
    state.unset(['app', 'model', 'tags', props.tag]);
  } else {
    state.set(['app', 'model', 'tags', props.tag, 'references'], refs - 1);
  }
};

