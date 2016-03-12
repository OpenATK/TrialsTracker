import * as _ from 'lodash';
import uuid from 'uuid';

export var changeSortMode = [
  setSortMode
];

export var removeNote = [
  unselectIfSelected, checkTags, deleteNote, 
];

export var textInputChanged = [
  setTextInputValue
];

export var selectNote = [
  unselectNote, selectNewNote, updateTagsList,
];

export var clickedShowHideButton = [
];

export var addNewNote = [
  unselectNote, createNewNote
];

function setSortMode ({input, state}) {
  state.set(['home', 'view', 'sort_mode'], input.newSortMode);
};

function unselectNote ({input, state}) {
  if (!_.isEmpty(state.get(['home', 'model', 'selected_note']))) {
    state.set(['home', 'model', 'notes', state.get(['home', 'model', 'selected_note']), 'selected'], false);
  }
  state.set(['home', 'model', 'selected_note'], {});
};

function selectNewNote ({input, state}) {
  state.set(['home', 'model', 'selected_note'], input.newSelectedNote);
  state.set(['home', 'model', 'notes', input.newSelectedNote, 'selected'], true);
};

function setTextInputValue ({input, state}) {
  state.set(['home', 'model', 'notes', input.noteId, 'text']);
};
 
function unselectIfSelected ({input, state}) {
  if (input.id === state.get(['home', 'model', 'selected_note'])) {
    state.set(['home', 'model', 'selected_note'], {});
  }
};

function checkTags ({input, state}) {
  _.each(state.get(['home', 'model', 'notes', input.id, 'tags']), function(tag) {
    if (_.has(state.get(['home', 'model', 'tags']), tag) && state.get(['home', 'model', 'tags', tag, 'references']) === 1) {
      state.unset(['home', 'model', 'tags', tag]); 
    }
  });
};

function deleteNote({input, state}) {
  console.log(input.id);
  state.unset(['home', 'model', 'notes', input.id]); 
  console.log(state.get(['home', 'model', 'notes']));
};

function updateTagsList({state}) {
  _.each(state.get(['home', 'model', 'notes']), function(note) {
    _.each(note.tags, function(tag) {
      if (!_.includes(state.get(['home','model', 'tags']),tag)) {
        state.set(['home', 'model', 'tags', tag], {
          text: tag,
          references: 1,
        });
      } else {
        var refs = state.get(['home', 'model', 'tags', tag, 'references']);
        state.set(['home', 'model', 'tags', tag, 'references'], refs++);
      }
    });
  });
};

function createNewNote({state}) {
  var newNote = {
    text: '',
    tags: [],
    fields: [],
    geojson: { "type":"Polygon",
      "coordinates": [
        []
      ]
     },
     geojson_visible: 'Show',
     color: getColor(),
     completions: [],
     selected: true,
     id: uuid.v4(),
  };
  state.set(['home', 'model', 'notes', newNote.id], newNote);
};

function getColor() {
  var r = (Math.round(Math.random()*127) + 127).toString(16);
  var g = (Math.round(Math.random()*127) + 127).toString(16);
  var b = (Math.round(Math.random()*127) + 127).toString(16);
  return '#' + r.toString() + g.toString() + b.toString();
}
