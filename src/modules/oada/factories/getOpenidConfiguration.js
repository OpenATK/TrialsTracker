import Promise from 'bluebird';
import normalizeUrl from 'normalize-url';
import url from 'url';
import axios from 'axios';
/*
  Gets the .well-known/openid-configuration resource from oada server.

  Parameters:
    Required:
      `domain`
*/
function getOpenidConfigurationFactory ({domain, funcMode}) {
  function getOpenidConfiguration({state, resolve, path}) {
    return Promise.resolve().then(() => {
      let _path = funcMode ? null : path;
      let _domain = resolve.value(domain);
      if (!_domain) throw new Error('Must provide a `domain` to getOpenidConfiguration.');
      //Normalize the domain if it is wonky format
      _domain = url.parse(normalizeUrl(_domain));
      return axios({
        method: 'get',
        url: 'https://' + _domain.host + '/.well-known/openid-configuration'
      }).then((response) => {
        if (!response.data) throw new Error('No data provided in .well-known response.');
        if (_path) return _path.success({response: response.data});
        return {response: response.data};
      }).catch((error) => {
        if (_path) return _path.error({error});
        throw error;
      });
    });
  }
  return getOpenidConfiguration
}

getOpenidConfigurationFactory.func = function func(args) {
  function getOpenidConfiguration(options) {
    options.funcMode = true;
    return getOpenidConfigurationFactory(options)(args[0]);
  }
  return getOpenidConfiguration;
}

export default getOpenidConfigurationFactory;
