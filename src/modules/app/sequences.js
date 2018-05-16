import _ from 'lodash';
import MobileDetect from 'mobile-detect';
import { getConnections } from '../Connections/chains'
import * as oada from '../oada/sequences'
import { sequence } from 'cerebral'

export var init = [
	sequence('init', [
		setMobile,
	//	...getConnections,
	]),
];

export var clearCache = [
  destroyCache, {
    success: [],
    error: []
  },
];

function setMobile({state}) {
  var md = new MobileDetect(window.navigator.userAgent);
  state.set(`app.is_mobile`, (md.mobile() !== null));
}

function destroyCache({path, oada}) {
  return oada.cache.db.destroy()
  .then((result) => {
    return path.success({result})
  }).catch((error) => {
    return path.error({error})
  })
};
