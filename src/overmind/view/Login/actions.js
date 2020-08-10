export default {
  onInitialize({ state, actions }) {
    const domain = window.localStorage['oada:domain'];
    const token = window.localStorage['oada:token'];
    if (domain) {
      state.view.Login.domain = domain
    }
    if (domain && token) {
      //Auto login
      actions.view.Login.login({token});
    }
  },
  async login({ state, actions }, {token}) {
    const myState = state.view.Login;
    let domain = myState.domain;
    myState.loading = true;
    domain = domain.match(/^http/) ? domain : 'https://'+myState.domain;
    await actions.app.OADAManager.login({domain, token});
    myState.loading = false;
    if (state.app.OADAManager.connected) {
      myState.loggedIn = true;
      //Save domain and token
      window.localStorage['oada:domain'] = myState.domain;
      window.localStorage['oada:token'] = state.app.OADAManager.token;
    }
  },
  async logout({ state, actions }) {
    const myState = state.view.Login;
    if (state.app.OADAManager.connected) {
      await actions.app.OADAManager.logout();
      delete window.localStorage['oada:domain']
      delete window.localStorage['oada:token']
    }
    myState.loggedIn = false;
  },
  domainChange({ state }, data) {
    const myState = state.view.Login;
    myState.domain = data.value;
  },
  viewDemo({ state }, data) {
    const myState = state.view.Login;
    myState.loggedIn = true;
  }
}
