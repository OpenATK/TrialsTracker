import axios from 'axios';
import normalizeUrl from 'normalize-url'
import _url from 'url'

/*
  HEAD a resource on oada cloud, using websocket if available

  Parameters:
    Required:
      `path`
    Optional:
      `domain`,
      `token`
*/

function headFactory ({path: resPath, domain, token, funcMode}) {
  function head({state, resolve, path, oada}) {
    return Promise.resolve().then(() => {
      //Remove the path if we are running in function mode, so paths in original action work
      let _path = (funcMode) ? null : path;
      //Resolve path, domain, and token values if they are tags
      let _resPath = resolve.value(resPath);
      let _domain = resolve.value(domain) || state.get('Connections.oada_domain');
      let _token = resolve.value(token) || state.get('Connections.oada_token')
      /*
        - Execute get -
        Use axios if our websocket isn't configured, or isn't configured for the
        correct domain
				*/
			_domain = _url.parse(normalizeUrl(_domain))
			let url = _domain.protocol+'//'+_domain.host+_resPath;
			let request = (oada === null || oada.url !== _domain) ? axios : oada.http;
      return request({
        method: 'HEAD',
        url,
        headers: {
          Authorization: 'Bearer '+_token
        }
      }).then((response) => {
        if (_path) return _path.success({response});
        return {response};
      }).catch((error) => {
        if (_path) return _path.error({error});
        throw error;
      });
    });
  }
  return head
}

headFactory.func = function func(args) {
  function head(options) {
    options.funcMode = true;
    return headFactory(options)(args[0]);
  }
  return head;
}

export default headFactory;
