import getOpenidConfiguration from './getOpenidConfiguration';
/*
  Gets the .well-known/openid-configuration/issuer from oada server.

  Parameters:
    Required:
      `domain`
*/

function getOpenidIssuerFactory ({domain, funcMode}) {
  function getOpenidIssuer({state, resolve, path}) {
    let _path = path;
    return getOpenidConfiguration.func(arguments)({domain}).then(({response}) => {
      if (!response.issuer) throw new Error('No issuer found in response.');
      if (_path) return _path.success({issuer: response.issuer});
      return {issuer: response.issuer}
    }).catch((error) => {
      console.log(error);
      if (_path) return _path.error({error});
      throw error;
    });
  }
  return getOpenidIssuer
}

getOpenidIssuerFactory.func = function func(args) {
  function getOpenidIssuer(options) {
    options.funcMode = true;
    return getOpenidIssuerFactory(options)(args[0]);
  }
  return getOpenidIssuer;
}

export default getOpenidIssuerFactory;
