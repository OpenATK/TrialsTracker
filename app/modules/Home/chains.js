import * as _ from 'lodash';
export var noteRemoved = [
 unsetState 
];

export var noteTextChanged = [
  setState
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

function unselectNote ({input, state}) {
  console.log(input);
  if (!_.isEmpty(state.get(['home', 'model', 'selected_note']))) {
    state.set(['home', 'model', 'notes', state.get(['home', 'model', 'selected_note']), 'class_name'], 'note');
  }
  state.set(['home', 'model', 'selected_note'], {});
};

function selectNewNote ({input, state}) {
  state.set(['home', 'model', 'selected_note'], input.newSelectedNote);
  state.set(['home', 'model', 'notes', input.newSelectedNote, 'class_name'], 'selected-note');
};

function getState({input}) {
  state.get(input.stateLocation);
};

function unsetState({input, state}) {
  state.unset(input);
};

function setState({input, state}) {
 state.set(input.cursor, input.vale);
};
