import Promise from 'bluebird';
import normalizeUrl from 'normalize-url';
import url from 'url';
import {redirect, metadata, scope} from '../../../config'
let getAccessToken = Promise.promisify(require('oada-id-client').getAccessToken)

/*
  Opens a popup to oauth to get an access token.

  Parameters:
    Required:
      `domain`
*/

function getTokenFactory ({domain, funcMode}) {
  function getToken({state, resolve, path}) {
    let _path = funcMode ? null : path;
		let _domain = resolve.value(domain);
    let options = {
      metadata,
      scope,
      redirect
    };

    _domain = url.parse(normalizeUrl(_domain));

		return getAccessToken(_domain.hostname, options).then((accessToken) => {
      if (_path) return _path.success({accessToken: accessToken.access_token});
      return {accessToken: accessToken.access_token};
    }).catch((error) => {
      if (_path) return _path.error({error});
      throw error;
    });
  }
  return getToken
}

getTokenFactory.func = function func(args) {
  function getToken(options) {
    options.funcMode = true;
    return getTokenFactory(options)(args[0]);
  }
  return getToken;
}

export default getTokenFactory;
