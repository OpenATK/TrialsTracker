import * as _ from 'lodash';

export var changeSortMode = [
  setSortMode
];

export var noteRemoved = [
 unsetState 
];

export var textInputChanged = [
  setInputValue
];

export var noteAdded = [

];

export var selectNote = [
  unselectNote, selectNewNote,
];

export var clickedShowHideButton = [
  getState, {
    show: [setState],
    set: [setState]
  },
];

function setSortMode ({input, state}) {
  console.log('changed sort mode');
  state.set(['home', 'view', 'sort_mode'], input.newSortMode);
};

function unselectNote ({input, state}) {
  console.log(input);
  if (!_.isEmpty(state.get(['home', 'model', 'selected_note']))) {
    state.set(['home', 'model', 'notes', state.get(['home', 'model', 'selected_note']), 'selected'], false);
  }
  state.set(['home', 'model', 'selected_note'], {});
};

function selectNewNote ({input, state}) {
  state.set(['home', 'model', 'selected_note'], input.newSelectedNote);
  state.set(['home', 'model', 'notes', input.newSelectedNote, 'selected'], true);
};

function setInputValue ({input, state}) {
  state.set(['home', 'model', 'notes', input.noteId, 'text']);
};

function getState({input, state}) {
  state.get(input.stateLocation);
};

function unsetState({input, state}) {
  state.unset(input);
};

function setState({input, state}) {
 state.set(input.cursor, input.vale);
};
