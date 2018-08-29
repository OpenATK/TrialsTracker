import MobileDetect from 'mobile-detect';
import { sequence } from 'cerebral'
import { set } from 'cerebral/operators'
import { props } from 'cerebral/tags'
import * as fields from '@oada/fields-module/sequences'
import oada from '@oada/cerebral-module/sequences'
import * as notes from '../notes/sequences'
import * as yieldMod from '../yield/sequences'

export const init = sequence('init', [
  setMobile,
  ({state, props}) => ({
    domain: 'https://vip3.ecn.purdue.edu',
    token: 'def',
    options: {
			redirect: 'http://vip3.ecn.purdue.edu:8000/oauth2/redirect.html',
			metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly92aXAzLmVjbi5wdXJkdWUuZWR1OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJPcGVuQVRLIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vdmlwMy5lY24ucHVyZHVlLmVkdSIsImNvbnRhY3RzIjpbIlNhbSBOb2VsIDxzYW5vZWxAcHVyZHVlLmVkdT4iXSwic29mdHdhcmVfaWQiOiIxZjc4NDc3Zi0zNTQxLTQxM2ItOTdiNi04NjQ0YjRhZjViYjgiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTUxMjAwNjc2MX0.AJSjNlWX8UKfVh-h1ebCe0MEGqKzArNJ6x0nmta0oFMcWMyR6Cn2saR-oHvU8WrtUMEr-w020mAjvhfYav4EdT3GOGtaFgnbVkIs73iIMtr8Z-Y6mDEzqRzNzVRMLghj7CyWRCNJEk0jwWjOuC8FH4UsfHmtw3ouMFomjwsNLY0',
			scope: 'oada.yield:all'
    }, 
  }),
  ({props}) =>({signals:['notes.updateYieldStatsGeohashes']}),
  yieldMod.init,
  ({props}) => ({signals: ['notes.getFieldNotes']}),
  fields.init,
  set(props`signals`, undefined),
  notes.init,
])

export const clearCacheButtonClicked = sequence('app.clearCache', [
  ({state, props}) => ({
    connection_id: 'vip3',
  }),
  oada.resetCache,
	init
]);

function setMobile({state}) {
  var md = new MobileDetect(window.navigator.userAgent);
  state.set(`app.is_mobile`, (md.mobile() !== null));
}
