export default function setFieldDataForNotes({input, state}) {
  if (input.noteFields) {
    Object.keys(input.noteFields).forEach((noteId) => {
      state.set(['app', 'model', 'notes', noteId, 'fields'], {});
      Object.keys(input.noteFields[noteId]).forEach((fieldId) => {
        state.set(['app', 'model', 'notes', noteId, 'fields', fieldId], input.noteFields[noteId][fieldId]);
      })
    })
  }
}
