export default function setFieldDataForNotes({props, state}) {
  if (props.noteFields) {
    Object.keys(props.noteFields).forEach((noteId) => {
      state.set(['App', 'model', 'notes', noteId, 'fields'], {});
      Object.keys(props.noteFields[noteId]).forEach((fieldId) => {
        state.set(['App', 'model', 'notes', noteId, 'fields', fieldId], props.noteFields[noteId][fieldId]);
      })
    })
  }
}
