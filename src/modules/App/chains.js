import _ from 'lodash';
import db from '../Pouch';
import MobileDetect from 'mobile-detect';
import { getConnections } from '../Connections/chains'

export var initialize = [
  setMobile,
	...getConnections,
];

export var removeGeohashes = [
  unregisterGeohashes,
];

export var addGeohashes = [
  registerGeohashes,
];

export var clearCache = [
  destroyCache, {
    success: [],
    error: []
  },
];

function setMobile({state}) {
  var md = new MobileDetect(window.navigator.userAgent);
  state.set(`App.is_mobile`, (md.mobile() !== null));
}

function destroyCache({path}) {
  return db().destroy()
  .then((result) => {
    return path.success({result})
  }).catch((error) => {
    return path.error({error})
  })
};

function registerGeohashes({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
  let coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
  state.set(`App.view.map.geohashes_on_screen.${props.layer}`, {[coordsIndex]: props.geohashes})
}

function unregisterGeohashes({props, state}) {
  var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
  state.unset(`App.view.map.geohashes_on_screen.${props.layer}.${coordsIndex}`);
}
