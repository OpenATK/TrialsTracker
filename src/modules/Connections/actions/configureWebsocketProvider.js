import Promise from 'bluebird';

export default function configureWebsocketProvider ({oada, state, props}) {
  return Promise.resolve().then(() => {
		if (oada == null) throw new Error('Websocket provider is undefined. Please add it to your controller.')
		let url = 'https://'+props.domain
		url = url.replace('https://', 'wss://').replace('http://', 'ws://');
		url = url.indexOf('ws') !== 0 ? 'wss://' + url : url;
		return oada.configure(url);
  })
}
