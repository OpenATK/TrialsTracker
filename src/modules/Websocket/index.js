import websocket from '../OADA/factories/websocket';
var singleton = null;

function websocketFactory(name) {
  return function websocket() {

	}
}

module.exports = () => {
  if (!singleton) singleton = websocket(url, promise);
  return singleton;
}

