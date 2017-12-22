import recursiveGet from '../../OADA/factories/recursiveGet'

export default function getYieldDataIndex({state, path, oada}) {
  let token = state.get('Connections.oada_token');
	let domain = state.get('Connections.oada_domain');
  let setupTree = {
	  harvest: {
	  	'_type': "application/vnd.oada.harvest.1+json",
		  'tiled-maps': {
		  	'_type': "application/vnd.oada.tiled-maps.1+json",
		  	'dry-yield-map': {
		  		'_type': "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
		  		'crop-index': {
		  			'*': {
		  		    "_type": "application/vnd.oada.tiled-maps.dry-yield-map.1+json",
		  				'geohash-length-index': {
		  					'*': {
		  						'geohash-index': {
		  						}
		  					}
		  				}
		  			}
		  		}
		  	}
		  }
	  }
  }
	return recursiveGet.func(arguments)({
		domain, 
		token, 
		path:'', 
		setupTree, 
		headers: {},
		websocket: oada
	}).then((data) => {
		return path.success(data)
	}).catch((err) => {
		console.log(err)
    return path.error({error: err})
	})
}
