function setFieldBoundaries({props, state}) {
  if (props.fields) {
		Object.keys(props.fields).forEach((field) => {
			state.set(`Fields.${field}`, { 
				boundary: props.fields[field].boundary,
				id: field,
			});
    })
  }
}
export default setFieldBoundaries;
