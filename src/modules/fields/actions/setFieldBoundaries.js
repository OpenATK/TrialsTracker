function setFieldBoundaries({props, state}) {
  if (props.fields) {
		Object.keys(props.fields['fields-index']).forEach((fieldGroup) => {
		  Object.keys(props.fields['fields-index'][fieldGroup]['fields-index']).forEach((field) => {
			  state.set(`Fields.${field}`, { 
			  	boundary: props.fields['fields-index'][fieldGroup]['fields-index'][field].boundary,
			  	id: field,
			  });
      })
    })
  }
}
export default setFieldBoundaries;
