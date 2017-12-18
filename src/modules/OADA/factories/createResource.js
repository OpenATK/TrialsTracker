import post from './post';
import put from './put';
/*
  Create a resource on oada cloud and link it to `path`

  Parameters:
    Required:
      `path`
    Optional:
      `domain`,
      `contentType`,
      `token`
*/

function _createResource({domain, path, contentType, token, args}) {
  //Remove the path if we are running in function mode, so paths in original action work
  return post.func(args)({
    domain,
    token,
    path: '/resources',
    headers: {
      'Content-Type': contentType
    },
    data: {}
  }).then(({response}) => {
    var id = response.headers.location.split('/')
    id = id[id.length-1]

    return put.func(args)({
      domain,
      path,
      token,
      headers: {
        'Content-Type': contentType
      },
      data: {
        _id:'resources/'+id,
        _rev: '0-0'
      }
    });
  });
}

function createResourceFactory ({path, domain, contentType, token}) {
  function createResource({state, resolve}) {
    //TODO require contentType (don't default)
    let _contentType = resolve.value(contentType) || 'application/vnd.trellisfw.1+json';
    return _createResource({domain, path, token, _contentType, args: arguments});
  }
  return createResource
}

createResourceFactory.func = function func(args) {
  function createResource(options) {
    return createResourceFactory(options)(args[0]);
  }
  return createResource;
}

export default createResourceFactory;
