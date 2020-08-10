export default {
  OADADomain: {
    open({state}) {
      const myState = state.view.Modals.OADADomain;
      myState.open = true;
    },
    close({state}) {
      const myState = state.view.Modals.OADADomain;
      myState.open = false;
    },
    onConnectClick({actions}) {
      const myActions = actions.view.Modals.OADADomain;
      myActions.open();
    },
    onDomainChange({state}, {domain}) {
      const myState = state.view.Modals.OADADomain;
      myState.domain = domain;
    },
    async onConnect({actions, state}) {
      const myState = state.view.Modals.OADADomain;
      const myActions = actions.view.Modals.OADADomain;
      const {domain} = myState;
      myState.loading = true;
      await actions.app.OADAManager.onDomainChanged({domain});
      myState.loading = false;
      myActions.close()
    },
    onCancel({actions}) {
      const myActions = actions.view.Modals.OADADomain;
      myActions.close();
    }
  }
}
