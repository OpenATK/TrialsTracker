import _state from './state'
import _actions from './actions'
import * as SaveField from './SaveField'
import * as NewOperation from './NewOperation'
import * as NewFarm from './NewFarm'

export const state = {
  SaveField: SaveField.state,
  NewOperation: NewOperation.state,
  NewFarm: NewFarm.state,
  ..._state
};
export const actions = {
  SaveField: SaveField.actions,
  NewOperation: NewOperation.actions,
  NewFarm: NewFarm.actions,
  ..._actions
}
