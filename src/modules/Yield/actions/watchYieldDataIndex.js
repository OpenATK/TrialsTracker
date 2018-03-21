import Promise from 'bluebird'

export default function watchYieldDataIndex({state, path, props, oada}) {
  let token = state.get('Connections.oada_token');
	let domain = state.get('Connections.oada_domain');
	if (props.harvest) {
		return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
			console.log(crop);
			return Promise.map(Object.keys(props.harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'] || {}), (ghLen) => {
				let url = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/'+ghLen;
        return oada.watch({
					url,
      		headers: {Authorization: 'Bearer '+token},
				}, 'Yield.dataReceived', {crop, ghLen})
			})
		}).then(() => {
		  return path.success({})
	  }).catch((err) => {
		  console.log(err)
      return path.error({error: err})
		})
	} 
	return path.success({})
}
