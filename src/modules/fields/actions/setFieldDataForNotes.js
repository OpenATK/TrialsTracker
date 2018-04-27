function setFieldDataForNotes({props, state}) {
  if (props.noteFields) {
    Object.keys(props.noteFields).forEach((id) => {
      state.set(`Note.notes.${id}.fields`, {});
      Object.keys(props.noteFields[id]).forEach((fieldId) => {
        state.set(`Note.notes.${id}.fields.${fieldId}`, props.noteFields[id][fieldId]);
      })
    })
  }
}
export default setFieldDataForNotes;
