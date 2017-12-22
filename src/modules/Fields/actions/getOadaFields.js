import recursiveGet from '../../OADA/factories/recursiveGet'

function getOadaFields({state, path, oada}) {
  var token = state.get('Connections.oada_token');
	var domain = state.get('Connections.oada_domain');
	var setupTree = {
    fields: {
			'_type': "application/vnd.oada.fields.1+json",
			'fields-index': {
        '*': {
					'_type': "application/vnd.oada.field.1+json",
					'fields-index': {
						'*': {
							'_type': "application/vnd.oada.field.1+json"
						}
					}
				}
			}
		}
	}
	return recursiveGet.func(arguments)({
		domain,
		token,
		path: '',
		setupTree,
    headers: {},
		websocket: oada
	}).then((data) => {
    return path.success(data);
	}).catch((error) => {
		console.log(error)
    return path.error({error});
  })
}
export default getOadaFields;
