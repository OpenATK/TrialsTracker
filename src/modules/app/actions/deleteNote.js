function deleteNote({input, state}) {
  state.unset(['app', 'model', 'notes', input.id]); 
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    if (notes[note].order > input.note) {
      state.set(['app', 'model', 'notes', note, 'order'], notes[note].order);
    }
  })
};
