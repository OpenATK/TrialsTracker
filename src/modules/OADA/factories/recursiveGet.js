import _oada from './index.js'

/*
  Recursively GET a tree of data on oada cloud, using websocket if available.

  Parameters:
    Required:
      `path`
    Optional:
      `domain`,
      `token`
*/

function recursiveGetFactory ({path: resPath, domain, setupTree, token, headers, funcMode}) {
  function recursiveGet({state, resolve, path, oada}) {
    return Promise.resolve().then(() => {
      //Remove the path if we are running in function mode, so paths in original action work
      let _path = (funcMode) ? null : path;
      //Resolve path, domain, and token values if they are tags
			let _resPath = resolve.value(resPath);
			let _setupTree = resolve.value(setupTree);
			let _headers = resolve.value(headers);
      let _domain = resolve.value(domain) || state.get('Connections.oada_domain');
      let _token = resolve.value(token) || state.get('Connections.oada_token')
      /*
        - Execute get -
        Use axios if our websocket isn't configured, or isn't configured for the
        correct domain
			*/
      return _oada.recursiveGet(_domain, _token, _resPath, _setupTree, _headers, oada)
			.then((response) => {
        if (_path) return _path.success(response);
        return response;
      }).catch((error) => {
        if (_path) return _path.error({error});
        throw error;
      });
    });
  }
  return recursiveGet
}

recursiveGetFactory.func = function func(args) {
  function recursiveGet(options) {
    options.funcMode = true;
    return recursiveGetFactory(options)(args[0]);
  }
  return recursiveGet;
}

export default recursiveGetFactory;
