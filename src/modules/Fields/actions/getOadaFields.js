import cache from '../../Cache'
import Promise from 'bluebird'

function getOadaFields({state, path}) {
  var token = state.get('Connections.oada_token');
  var domain = state.get('Connections.oada_domain');
  var url = 'https://' + domain + '/bookmarks/fields/fields-index/';
  var fields = {};
	return cache.get(url, token).then((fieldsIndex) => {
		return Promise.map(Object.keys(fieldsIndex), (item) => {
			return cache.get(url + item, token).then((fieldItem) => {
        if (fieldItem['fields-index']) {
					return cache.get(url + item + '/fields-index/', token).then((fieldKeys) => {
						return Promise.map(Object.keys(fieldKeys), (key) => {
							return cache.get(url + item + '/fields-index/'+key, token).then((field) => {
                fields[key] = field;
                return true;
              })
            })
          })
        } else {
					return cache.get(url + item, token).then((field) => {
            fields[item] = field;
            return true;
          })
        }
      })
    })
	}).then(() => {
    return path.success({fields});
	}).catch((error) => {
		console.log(error)
    return path.error({error});
  })
}
export default getOadaFields;
