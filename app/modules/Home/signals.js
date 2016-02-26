export var noteRemoved = [
 unsetState 
];

export var noteTextChanged = [
  setState
];

export var noteAdded = [

];

export var noteSelected = [
  setState
];

export var clickedShowHideButton = [
  getState, {
    show: [setState],
    set: [setState]
  },
];

function getState({input}) {
  state.get(input.stateLocation);
};

function unsetState({input, state}) {
  state.unset(input);
};

function setState({input, state}) {
  state.set(input.stateLocation, input.vale);
};
