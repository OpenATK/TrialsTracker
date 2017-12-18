import head from './index.js';
/*
  Checks if a resource exists at an OADA cloud

  Parameters:
    Required:
      `path`
    Optional:
      `domain`,
      `token`

  Response:
    path: `yes`, `no`, `error`
*/

function checkIfExists({domain, token, path, args}) {
  return head.func(args)({domain, path, token}).then(({response}) => {
    return true;
  }).catch((error) => {
    if (error.response && error.response.status === 404) return false;
    console.log('Error', error);
    throw error;
  });
}

function doesResourceExistFactory ({path: resPath, domain, token, funcMode}) {
  function doesResourceExist({state, path, resolve}) {
    //Remove the path if we are running in function mode, so paths in original action work
    let _path = (funcMode) ? null : path;
    //Check if exists
    return checkIfExists({domain, path: resPath, token, args: arguments}).then((exists) => {
      if (!_path) return {resourceExists: exists};
      if (exists) return _path.yes();
      return _path.no();
    }).catch((error) => {
      if (_path && _path.error) return _path.error({error});
      throw error;
    });
  }
  return doesResourceExist
}

doesResourceExistFactory.func = function func(args) {
  function doesResourceExist(options) {
    options.funcMode = true;
    return doesResourceExistFactory(options)(args[0]);
  }
  return doesResourceExist;
}


export default doesResourceExistFactory;
