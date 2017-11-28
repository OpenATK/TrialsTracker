function setYieldDataIndex({props, state}) {
  if (props.data) {
    Object.keys(props.data).forEach(function(crop) {
      state.set(`App.view.map.crop_layers.${crop}`, {visible: true});
      state.set(`App.view.map.geohashes_to_draw.${crop}`, {});
      state.set(`App.model.yield_data_index.${crop}`, {});
      Object.keys(props.data[crop]).forEach(function(ghLength) {
        state.set(`App.model.yield_data_index.${crop}.${ghLength}`, props.data[crop][ghLength]);
      })
    })
  }
}
export default setYieldDataIndex;
