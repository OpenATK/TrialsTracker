import _ from 'lodash';
export default {
  connected: false,
  //token: 'def',
  currentConnection: null,
  domain: null,
  user: ({currentConnection}, state) => {
    if (!currentConnection) return null;
    return _.get(state, 'oada.localhost.users.me');
  }
}
