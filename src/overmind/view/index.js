import _state from './state'
import _actions from './actions'

import * as Login from './Login'
import * as FieldDetails from './FieldDetails'
import * as FieldList from './FieldList'
import * as Map from './Map'
import * as Modals from './Modals'
import * as TopBar from './TopBar'

export const state = {
  Login: Login.state,
  FieldDetails: FieldDetails.state,
  FieldList: FieldList.state,
  Map: Map.state,
  Modals: Modals.state,
  TopBar: TopBar.state,
  ..._state
};
export const actions = {
  Login: Login.actions,
  FieldDetails: FieldDetails.actions,
  FieldList: FieldList.actions,
  Map: Map.actions,
  Modals: Modals.actions,
  TopBar: TopBar.actions,
  ..._actions
}
export const onInitialize = async ({actions}) => {
  await actions.app.onInitialize();
  await actions.view.Login.onInitialize();
}
