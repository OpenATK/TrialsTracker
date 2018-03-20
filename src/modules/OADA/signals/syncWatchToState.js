import {sequence} from 'cerebral'

export default sequence('syncWatchToState', [
  set,
])

function syncWatchToState({state, props, oada}) {
  state.set(`${props.prefix}.${props.path}, ${}`)
}
