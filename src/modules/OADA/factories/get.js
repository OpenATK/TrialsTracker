import axios from 'axios';
import db from 'pouchdb';

/*
  GET a resource on oada cloud, using websocket if available

  Parameters:
    Required:
      `path`
    Optional:
      `domain`,
      `token`
*/

function getFactory ({path: resPath, domain, token, funcMode}) {
  function get({state, resolve, path, websocket}) {
    return Promise.resolve().then(() => {
      //Remove the path if we are running in function mode, so paths in original action work
			let _path = (funcMode) ? null : path;
			console.log(resolve)
      //Resolve path, domain, and token values if they are tags
      let _resPath = resolve.value(resPath);
      let _domain = resolve.value(domain) || state.get('Connections.oada_domain');
      let _token = resolve.value(token) || state.get('Connections.oada_token')
      /*
        - Execute get -
        Use axios if our websocket isn't configured, or isn't configured for the
        correct domain
      */
			return db.get(_resPath).then((oadaId) => {
				return db.get(oadaId).then((res) => {
					if (_path) return _path.success({response: res.doc})
				})
			}).catch(()=> {
				// Cache lookup failed, try the server
				let url = _domain+'/bookmarks/'+_resPath;
			  let request = (websocket === null || websocket.url !== _domain) ? axios : websocket.http;
        return request({
          method: 'GET',
          url: url,
          headers: {
            Authorization: 'Bearer '+_token
					}
				}).then((response) => {
					let _id = response.headers.location.replace(/^\/resources\//, '')
					return db.put(_resPath, _id).then(()=> {
						return db.put(_id, response.data).then(() => {
              if (_path) return _path.success({response});
							return {response};
						})
					})
        }).catch((error) => {
          if (_path) return _path.error({error});
          throw error;
				})
			})
    })
  }
  return get
}

getFactory.func = function func(args) {
  function get(options) {
    options.funcMode = true;
    return getFactory(options)(args[0]);
  }
  return get;
}

export default getFactory;
