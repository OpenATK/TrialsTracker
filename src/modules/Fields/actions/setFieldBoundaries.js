export function setFieldBoundaries({props, state}) {
  if (props.fields) {
		Object.keys(props.fields).forEach((field) => {
      state.set(`App.model.fields.${field}`, props.fields[field]);
    })
  }
}
