function setYieldDataIndex({props, state}) {
  if (props.data) {
		Object.keys(props.data).forEach((crop) => {
      state.set(`Map.crop_layers.${crop}`, {visible: true});
      state.set(`Map.geohashesToDraw.${crop}`, {});
      state.set(`Yield.data_index.${crop}`, {});
			Object.keys(props.data[crop]).forEach((ghLength) => {
        state.set(`Yield.data_index.${crop}.${ghLength}`, props.data[crop][ghLength]);
      })
    })
  }
}
export default setYieldDataIndex;
