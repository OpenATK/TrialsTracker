import PouchDB from 'pouchdb';
import websocket from '../modules/OADA/factories/websocket'
import cache from '../modules/OADA/factories/cache'
PouchDB.plugin(require('pouchdb-upsert'))
var cachedProvider = null;

function wrapWebsocket(context, url) {
	return websocket(url).then((provider) => {
		let oldWatch = provider.watch;
   	provider.watch = (request, signalPath, payload) => {
      let signal = context.controller.getSignal(signalPath);
      if (signal == null) throw new Error('Signal at path `'+signalPath+'` is not defined.');
			return oldWatch(request, (response) => {
				payload.response = response;
 		    signal(payload);
 		  })
		}
	  return provider
	})
}

function createProvider(context, url) {
	let provider = {}
	if (url) {
		return wrapWebsocket(context, url).then((res) => {
			provider = res;
      provider.cache = cache(res, 'oada')
      return provider
		})
	}
  provider.cache = cache(provider, 'oada')
	provider.configure = function configure(url) {
		return createProvider(context, url).then((res) => {
			cachedProvider = res;
			return res
		})
  }
	return provider;
}

function oada(context) {
	context.oada = cachedProvider = (cachedProvider || createProvider(context));
	/*
  if (context.debugger) {
    context.debugger.wrapProvider('oada');
	}
	*/
  return context;
}

export default oada
