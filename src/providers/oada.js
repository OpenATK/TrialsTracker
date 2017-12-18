import Promise  from 'bluebird';
import websocket from '../modules/OADA/factories/websocket'
var cachedProvider = null;

function createProvider(context, url, promise) {
  var provider = {};
	if (url) {
		provider = websocket(url, promise);
		let oldWatch = provider.watch;
		provider.watch = (request, signalPath) => {
			oldWatch(request, (response) => {
        let signal = context.controller.getSignal(signalPath);
        if (signal == null) throw new Error('Signal at path `'+signalPath+'` is not defined.');
				signal({response});
			})
    }
  }
	provider.configure = function configure(url) {
    return new Promise((resolve, reject) => {
      let promise = {resolve, reject};
      cachedProvider = createProvider(context, url, promise);
    });
  }
  return provider;
}

function oada(context) {
  context.oada = cachedProvider = (cachedProvider || createProvider(context));
  if (context.debugger) {
    context.debugger.wrapProvider('oada');
  }
  return context;
}


export default oada;
