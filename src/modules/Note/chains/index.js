import { set, unset, toggle, copy } from 'cerebral/operators';
import uuid from 'uuid';
import rmc from 'random-material-color';
import Color from 'color';
import _ from 'lodash';

export var cancelNote = [
  set('state:app.view.editing_note', false),
  unset('state:app.view.selected_note'),
  unset(`state:app.model.notes.$id`)
]

export var toggleNoteDropdown = [
  copy('input:id', 'state:app.view.note_dropdown.note'),
  toggle('state:app.view.note_dropdown.visible'),
];

export var addTag = [
  addTagToNote, addTagToAllTagsList, 
  set('state:app.model.tag_input_text', ''),
];

export var removeTag = [
  removeTagFromNote, removeTagFromAllTagsList,
];

export var handleNoteListClick = [
  deselectNote, 
  set('state:app.view.editing_note', false),
];

export var enterNoteEditMode = [
  set('state:app.view.editing_note', true),
  selectNote,
];

export var exitNoteEditMode = [
  set('state:app.view.editing_note', false),
];

export var changeSortMode = [
  copy('input:newSortMode', 'state:app.view.sort_mode'),
];

export var removeNote = [
  set('state:app.view.editing_note', false),
  deselectNote,
  checkTags, 
  deleteNote, 
];

export var updateNoteText = [
  setNoteText,
];

export var updateTagText = [
  copy('input:value', 'state:app.model.tag_input_text'),
];

export var addNewNote = [
  deselectNote,
  createNote, 
  set('state:app.view.editing_note', true),
];

export var changeShowHideState = [
  changeShowHide, 
];

export var handleFieldNoteClick = [
  mapToFieldPolygon,
];

export var handleNoteClick = [
  mapToNotePolygon,
  isDrawing, {
    true: [],
    false: [
      deselectNote, 
      set('state:app.view.editing_note', false),
      selectNote, 
    ],
  },
];

function isDrawing ({input, state, output}) {
  if (state.get('app.view.editing_note')) {
    output.true({})
  } else output.false({})
}
isDrawing.outputs = ['true', 'false'];

function mapToNotePolygon({input, state}) {
  var note = state.get(['app', 'model', 'notes', input.id]);
  if (note) state.set(['app', 'view', 'map', 'map_location'], note.geometry.centroid);
}

function mapToFieldPolygon({input, state}) {
  var field = state.get(['app', 'model', 'fields', input.id]);
  if (field) state.set(['app', 'view', 'map', 'map_location'], field.boundary.centroid);
}

function deselectNote ({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  if (!_.isEmpty(note)) state.set(['app', 'model', 'notes', note, 'selected'], false);
  state.unset(['app', 'view', 'selected_note']);
};

function changeShowHide ({input, state}) {
  var geometryVisible = state.get(['app', 'model', 'notes', input.id, 'geometry', 'visible']);
  if (geometryVisible) {
    state.set(['app', 'model', 'notes', input.id, 'geometry', 'visible'], false);
  } else {
    state.set(['app', 'model', 'notes', input.id, 'geometry', 'visible'], true);
  }
};

function setNoteText ({input, state}) {
  state.set(['app', 'model', 'notes', input.id, 'text'], input.value);
};

function selectNote ({input, state}) {
  //check that the selected note isn't already selected
  if (state.get(['app', 'view', 'selected_note']) !== input.id) {
    // set the status of the currently selected note to "unselected"
    if (!_.isEmpty(state.get(['app', 'view', 'selected_note']))) {
      state.set(['app', 'model', 'notes', state.get(['app', 'view', 'selected_note']), 'selected'], false);
    }
    state.set(['app', 'view', 'selected_note'], input.id);
    state.set(['app', 'model', 'notes', input.id, 'selected'], true);
  }
};

function createNote({input, state}) {
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

function checkTags ({input, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  var noteTags = state.get(['app', 'model', 'notes', input.id, 'tags']);
  noteTags.forEach((tag) => {
    if (allTags[tag].references <= 1) {
      state.unset(['app', 'model', 'tags', tag]); 
    }
  })
}

function deleteNote({input, state}) {
  state.unset(['app', 'model', 'notes', input.id]); 
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    if (notes[note].order > input.id) {
      state.set(['app', 'model', 'notes', note, 'order'], notes[note].order);
    }
  })
};

function addTagToNote({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  state.concat(['app', 'model', 'notes', note, 'tags'], input.text);
};

function removeTagFromNote({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  var tags = state.get(['app', 'model', 'notes', note, 'tags']);
  var idx = tags.indexOf(input.tag);
  state.splice(['app', 'model', 'notes', note, 'tags'], idx, 1);
};

function addTagToAllTagsList({input, state}) {
  var allTags = state.get(['app', 'model', 'tags']);
  if (!allTags[input.text]) {
    state.set(['app', 'model', 'tags', input.text], { 
      text: input.text,
      references: 1
    });
  } else {
    state.set(['app', 'model', 'tags', input.text, 'references'], allTags[input.text].references+1);
  }
};

function removeTagFromAllTagsList({input, state}) {
  var refs = state.get(['app', 'model', 'tags', input.tag, 'references']);
  if (refs == 0) {
    state.unset(['app', 'model', 'tags', input.tag]);
  } else {
    state.set(['app', 'model', 'tags', input.tag, 'references'], refs - 1);
  }
};

