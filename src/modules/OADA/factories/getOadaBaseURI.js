import getOadaConfiguration from './getOadaConfiguration';
/*
  Gets the .well-known/oada-configuration/oada_base_uri from oada server.

  Parameters:
    Required:
      `domain`
*/

function getOadaBaseURIFactory ({domain, funcMode}) {
  function getOadaBaseURI({state, resolve, path}) {
    let _path = path;
    return getOadaConfiguration.func(arguments)({domain}).then(({response}) => {
      if (!response.oada_base_uri) throw new Error('No oada_base_uri found in response.');
      if (_path) return _path.success({baseURI: response.oada_base_uri});
      return {baseURI: response.oada_base_uri}
    }).catch((error) => {
      console.log(error);
      if (_path) return _path.error({error});
      throw error;
    });
  }
  return getOadaBaseURI
}

getOadaBaseURIFactory.func = function func(args) {
  function getOadaBaseURI(options) {
    options.funcMode = true;
    return getOadaBaseURIFactory(options)(args[0]);
  }
  return getOadaBaseURI;
}

export default getOadaBaseURIFactory;
