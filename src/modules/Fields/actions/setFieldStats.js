function setFieldStats({props, state}) {
	if (props.stats) {
    Object.keys(props.stats).forEach((field) => {
      Object.keys(props.stats[field]).forEach((crop) => {
        if (isNaN(props.stats[field][crop].mean_yield)) {
        } else {
          state.set(`Fields.${field}.stats.${crop}`, props.stats[field][crop]);
        }
      })
		})
	}
}
export default setFieldStats;
