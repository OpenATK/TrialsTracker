function setYieldDataIndex({props, state}) {
  if (props.harvest) {
		Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index']).forEach((crop) => {
      state.set(`Map.crop_layers.${crop}`, {visible: true});
      state.set(`Map.geohashesToDraw.${crop}`, {});
      state.set(`Yield.data_index.${crop}`, {});
			Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index']).forEach((ghLength) => {
				state.set(`Yield.data_index.${crop}.${ghLength}`, props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index']);
      })
    })
  }
}
export default setYieldDataIndex;
