import uuid from 'uuid';
import rmc from 'random-material-color';

function createNote({input, state}) {
  var notes = state.get(['app', 'model', 'notes']);
  Object.keys(notes).forEach(function(note) {
    state.set(['app', 'model', 'notes', note, 'order'], notes[note].order +1);
  })
  var note = state.get(['app', 'view', 'selected_note']);
  if (!_.isEmpty(note)) {
    state.set(['app', 'model', 'notes', note, 'selected'], false);
  }
  state.set(['app', 'view', 'selected_note'], {});
  state.set(['app', 'view', 'editing_note'], false);

  var newNote = {
    time: Date.now(),
    id: uuid.v4(),
    text: '',
    tags: [],
    fields: [],
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

  //Now select the new note
  state.set(['app', 'view', 'selected_note'], newNote.id);
};

