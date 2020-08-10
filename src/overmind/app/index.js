import _state from './state'
import _actions from './actions'

import * as OADAManager from './OADAManager'
import oadaCacheOvermind from '@oada/oada-cache-overmind'

const oada =  oadaCacheOvermind('app.oada')

export const state = {
  oada: oada.state,
  OADAManager: OADAManager.state,
  ..._state
};
export const actions = {
  oada: oada.actions,
  OADAManager: OADAManager.actions,
  ..._actions
}
export const effects = {
  oada: oada.effects
}
