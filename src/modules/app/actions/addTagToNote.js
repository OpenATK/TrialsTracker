function addTagToNote({input, state}) {
  var note = state.get(['app', 'view', 'selected_note']);
  state.concat(['app', 'model', 'notes', note, 'tags'], input.text);
};


