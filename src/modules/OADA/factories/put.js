import axios from 'axios';
import _ from 'lodash';

/*
  PUT to a resource on oada cloud

  Parameters:
    Required:
      `path`,
      `data`
    Optional:
      `domain`,
      `token`,
      `funcMode`
*/

function putFactory ({path: resPath, domain, token, data, funcMode, headers}) {
  function put({state, resolve, path, websocket}) {
    return Promise.resolve().then(() => {
      //Remove the path if we are running in function mode, so paths in original action work
      let _path = (funcMode) ? null : path;
      //Resolve path, domain, and token values if they are tags
      let _resPath = resolve.value(resPath);
      let _domain = resolve.value(domain) || state.get('Connections.oada_domain');
      let _token = resolve.value(token) || state.get('Connections.oada_token')
      //Resolve data value or values if they are tags
      let _data = (resolve.isTag(data)) ? resolve.value(data) : data;
      if (_.isObject(_data)) _data = _.mapValues(_data, (value) => {return resolve.value(value)});
      //Resolve headers value or values if they are tags
      let _headers = resolve.isTag(headers) ? resolve.value(headers) : headers;
      if (_.isObject(_headers)) _headers = _.mapValues(_headers, (value) => {return resolve.value(value)});
      /*
        - Execute put -
        Use axios if our websocket isn't configured, or isn't configured for the
        correct domain
      */
      let url = _domain+_resPath;
      let request = (websocket === null || websocket.url() !== _domain) ? axios : websocket.http;
      return request({
        method: 'PUT',
        url: url,
        headers: _.merge({Authorization: 'Bearer '+_token}, _headers),
        data: _data
      }).then((response) => {
        if (_path) return _path.success({response});
        return {response};
      }).catch((error) => {
        if (path) return _path.error({error});
        throw error;
      });
    });
  }
  return put
}

putFactory.func = function func(args) {
  function put(options) {
    options.funcMode = true;
    return putFactory(options)(args[0]);
  }
  return put;
}

export default putFactory;
