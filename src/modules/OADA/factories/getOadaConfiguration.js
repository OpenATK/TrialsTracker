import Promise from 'bluebird';
import normalizeUrl from 'normalize-url';
import url from 'url';
import axios from 'axios';
/*
  Gets the .well-known/oada-configuration resource from oada server.

  Parameters:
    Required:
      `domain`
*/
function getOadaConfigurationFactory ({domain, funcMode}) {
  function getOadaConfiguration({state, resolve, path}) {
    return Promise.resolve().then(() => {
      let _path = funcMode ? null : path;
      let _domain = resolve.value(domain);
      if (!_domain) throw new Error('Must provide a `domain` to getOadaConfiguration.');
      //Normalize the domain if it is wonky format
      _domain = url.parse(normalizeUrl(_domain));
      return axios({
        method: 'get',
        url: _domain.protocol + '//' + _domain.host + '/.well-known/oada-configuration'
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
  return getOadaConfiguration
}

getOadaConfigurationFactory.func = function func(args) {
  function getOadaConfiguration(options) {
    options.funcMode = true;
    return getOadaConfigurationFactory(options)(args[0]);
  }
  return getOadaConfiguration;
}

export default getOadaConfigurationFactory;
