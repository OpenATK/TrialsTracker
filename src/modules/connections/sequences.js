import MobileDetect from 'mobile-detect';
import { sequence } from 'cerebral'
import { set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import controller from '../../controller'
import oada from '@oada/cerebral-module/sequences'
import isValidDomain from 'is-valid-domain'

export const connect = sequence('connect', [
  ({props, state}) => ({
    domain: state.get('connections.connection.domain'),
  }),

  ({state, props}) => {
    var domain = props.domain;
    var onConnect = state.get('connections.onConnect');
    if (isValidDomain(props.domain)) {
      domain = 'https://'+props.domain;
      if (!onConnect || onConnect.length < 1) console.warn('Prop named onConnect is empty or undefined. Supply sequence string identifiers to be called following establishment of a connection with the connections module.')
      var sigs = onConnect.map((signal) => {
        var sig = controller.getSignal(signal)
        sig({domain});
      })
    } else {
      state.set(`connections.open`, true)
      state.set(`connections.onConnect`, props.onConnect)
    }
  }
])

export const cancelClicked = [
  set(state`connections.open`, false),
]

export const submitClicked = [
  set(state`connections.open`, false),
  connect,
]

export const oadaDomainChanged = sequence('oadaDomainChanged', [
  //check for errors
  set(state`connections.connection.domain`, props`value`)
])

export const signOutClicked = sequence('signOutClicked', [
  set(state`connections.open`, true),
  set(state`connections.connected`, false),
])
