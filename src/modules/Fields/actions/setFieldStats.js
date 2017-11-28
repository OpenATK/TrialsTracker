export function setFieldStats({props, state}) {
	if (props.stats) {
    Object.keys(props.stats).forEach((field) => {
      Object.keys(props.stats[field]).forEach((crop) => {
        if (isNaN(props.stats[field][crop].mean_yield)) {
          state.unset(['App', 'model', 'fields', field, 'stats', crop]);
        } else {
          state.set(['App', 'model', 'fields', field, 'stats', crop], props.stats[field][crop]);
        }
      })
		})
	}
}
