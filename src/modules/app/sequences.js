import MobileDetect from 'mobile-detect';
import { sequence } from 'cerebral'
import { when, set } from 'cerebral/operators'
import { state, props } from 'cerebral/tags'
import oada from '@oada/cerebral-module/sequences'
import * as fields from '@oada/fields-module/sequences'
import * as notes from '../notes/sequences'
import * as yieldMod from '../yield/sequences'
import * as connections from '../connections/sequences'
import { metadata, redirect } from '../../config'

export const init = sequence('init', [
  setMobile,
  ({props}) => ({
    onConnect: ['connected'],
  }),
  connections.connect,
])

export const connected = sequence('connected', [
  ({props}) => ({
    options: {
      metadata,
      redirect
    }
  }),
  when(props`domain`), {
    true: [
  /*
      ({props}) => ({signals:['notes.handleYieldStatsGeohashes']}),
      set(props`options.scope`, 'oada.yield:all'),
      yieldMod.init,
      */
      set(props`options.scope`, 'oada.yield:all'),
      ({props}) => ({signals: ['notes.onFieldUpdated']}),
      fields.init,
      set(props`options.scope`, 'oada.yield:all'),
      set(props`signals`, undefined),
      notes.init,
      set(state`connections.connected`, true),
    ],
    false: []
  }
])

export const clearCacheButtonClicked = sequence('app.clearCache', [
  oada.resetCache,
	init
]);

function setMobile({state}) {
  var md = new MobileDetect(window.navigator.userAgent);
  var mobile = md.mobile();
  state.set(`view.is_mobile`, (mobile ? true : false));
}
