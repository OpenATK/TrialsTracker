import MobileDetect from 'mobile-detect';
import * as oada from '../oada/sequences'
import { sequence } from 'cerebral'
import * as notes from '../notes/sequences'
import * as fields from '../fields/sequences'
import * as yieldMod from '../yield/sequences'

export const init = sequence('init', [
	setMobile,
	oada.init,
	oada.configureWs,
	oada.configureCache,
	notes.init,
	fields.init,
	yieldMod.init,
])

export const clearCacheButtonClicked = [
	oada.clearCache,
	init
];

function setMobile({state}) {
  var md = new MobileDetect(window.navigator.userAgent);
  state.set(`app.is_mobile`, (md.mobile() !== null));
}
