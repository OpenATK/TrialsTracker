import axios from 'axios';
import {oadaDomain} from '../../../config';
import _ from 'lodash';
import oada from './index.js';

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

function treePutFactory ({path: resPath, domain, token, data, setupTree, funcMode, headers}) {
  function treePut({state, resolve, path, websocket}) {
    return Promise.resolve().then(() => {
      //Remove the path if we are running in function mode, so paths in original action work
      let _path = (funcMode) ? null : path;
      //Resolve path, domain, and token values if they are tags
      let _resPath = resolve.value(resPath);
      let _domain = resolve.value(domain) || oadaDomain;
      let _token = resolve.value(token) || state.get('UserProfile.user.token')
      //Resolve data value or values if they are tags
      let _data = (resolve.isTag(data)) ? resolve.value(data) : data;
      if (_.isObject(_data)) _data = _.mapValues(_data, (value) => {return resolve.value(value)});
      //Resolve headers value or values if they are tags
      let _headers = resolve.isTag(headers) ? resolve.value(headers) : headers;
			if (_.isObject(_headers)) _headers = _.mapValues(_headers, (value) => {return resolve.value(value)});
			let _setupTree = resolve.isTag(setupTree) ? resolve.value(setupTree) : setupTree;
      /*
        - Execute treePut -
        Use axios if our websocket isn't configured, or isn't configured for the
        correct domain
			*/
			return oada.treePut(_domain, _token, _resPath, _data, _setupTree, _headers, websocket)
      .then((responses) => {
        if (_path) return _path.success({responses});
        return {responses};
      }).catch((error) => {
        if (path) return _path.error({error});
        throw error;
      });
    });
  }
  return treePut
}

treePutFactory.func = function func(args) {
  function treePut(options) {
    options.funcMode = true;
    return treePutFactory(options)(args[0]);
  }
  return treePut;
}

export default treePutFactory;
