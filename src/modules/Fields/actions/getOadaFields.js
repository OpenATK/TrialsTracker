import cache from '../../Cache'

export function getOadaFields({state, path}) {
  var token = state.get('App.settings.data_sources.yield.oada_token');
  var domain = state.get('App.settings.data_sources.yield.oada_domain');
  var url = 'https://' + domain + '/bookmarks/fields/fields-index/';
  var fields = {};
  return cache.get(url, token).then(function(fieldsIndex) {
    return Promise.map(Object.keys(fieldsIndex), function(item) {
      return cache.get(url + item, token).then(function(fieldItem) {
        if (fieldItem['fields-index']) {
          return cache.get(url + item + '/fields-index/', token).then(function(fieldKeys) {
            return Promise.map(Object.keys(fieldKeys), function(key) {
              return cache.get(url + item + '/fields-index/'+key, token).then(function(field) {
                fields[key] = field;
                return true;
              })
            })
          })
        } else {
          return cache.get(url + item, token).then(function(field) {
            fields[item] = field;
            return true;
          })
        }
      })
    }) 
  }).then(function() {
    return path.success({fields});
  }).catch(() => {
    return path.error({fields});
  })
}
