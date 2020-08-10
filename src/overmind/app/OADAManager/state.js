import _ from 'lodash';
export default {
  connected: false,
  currentConnection: null,
  domain: null,
  token: null,
  user: ({currentConnection}, state) => {
    if (!currentConnection) return null;
    return _.get(state, 'app.oada.localhost.users.me');
  }
}
