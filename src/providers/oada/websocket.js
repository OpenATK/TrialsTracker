const Promise = require('bluebird');
const uuid = require('uuid/v4');
let isWindow = false;
if (typeof window !== 'undefined' && window.WebSocket) {
	// eslint-disable-next-line
	WebSocket = window.WebSocket;
	isWindow = true;
}


function websocket(url) {
	//Create the message queue
	var messages = [];
	//Create the socket
	url = url.replace('https://', 'wss://').replace('http://', 'ws://');
	var socket = new WebSocket(url);
	var connected = false;
	var httpCallbacks = {};
	var watchCallbacks = {};

	function sendMessages() {
		if (!connected) return;
		messages.forEach((message) => {
			socket.send(JSON.stringify(message));
		});
		messages = [];
	}

	return new Promise((resolve, reject) => {
		socket.onopen = function(event) {
			connected = true;
			sendMessages();
			resolve(socket)
		}
		if (!isWindow) socket.on('open', socket.onopen)

		socket.onclose = function(event) {

		}
		if (!isWindow) socket.on('close', socket.onclose)
		socket.onmessage = function(event) {
			var response = JSON.parse(event.data);
			//Look for id in httpCallbacks
			if (response.requestId) {
				if (httpCallbacks[response.requestId]) {
					//Resolve Promise
					if (response.status >= 200 && response.status < 300) {
						httpCallbacks[response.requestId].resolve(response);
					} else {
						//Create error like axios
						let err = new Error('Request failed with status code '+response.status);
						err.request = httpCallbacks[response.requestId].request;
						err.response = {
							status: response.status,
							statusText: response.status,
							headers: response.headers,
							data: response.data
						};
						httpCallbacks[response.requestId].reject(err);
					}
					delete httpCallbacks[response.requestId];
				} else if (watchCallbacks[response.requestId]) {
					if (watchCallbacks[response.requestId].resolve) {
						if (response.status === 'success') {
							//Successfully setup websocket, resolve promise
							watchCallbacks[response.requestId].resolve(response);
						} else {
							let err = new Error('Request failed with status code '+response.status);
							err.response = response;
							watchCallbacks[response.requestId].reject(err);
						}
						//Remove resolve and reject so we process change as a signal next time
						delete watchCallbacks[response.requestId]['resolve'];
						delete watchCallbacks[response.requestId]['reject'];
					} else {
						if (watchCallbacks[response.requestId].callback == null) throw new Error('The given watch function has an undefined callback:', watchCallbacks[response.requestId]);
						watchCallbacks[response.requestId].callback(response);
					}
				}
			}
		}
		if (!isWindow) socket.on('message', socket.onclose)
	}).then(() => {

		function _http(request) {
			//Do a HTTP request
			return new Promise((resolve, reject) => {
				let message = {
					requestId: uuid(),
					method: request.method.toLowerCase(),
					path: (request.url.indexOf(url) === 0) ? request.url.replace(url, '') : request.url,
					data: request.data,
					headers: Object.entries(request.headers).map(([key, value]) => {
						return {[key.toLowerCase()]: value}
					}).reduce((a,b) => {
						return {...a, ...b}
					})
				};
				messages.push(message);
				httpCallbacks[message.requestId] = {
					request: request,
					resolve: resolve,
					reject: reject
				};
				sendMessages();
			 });
		}

		function _watch(request, callback) {
			//Watch for changes on requested resource and trigger provided signal
			return new Promise((resolve, reject) => {
				let message = {
					requestId: uuid(),
					method: 'watch',
					path: request.url,
					headers: Object.entries(request.headers).map(([key, value]) => {
						return {[key.toLowerCase()]: value}
					}).reduce((a,b) => {
						return {...a, ...b}
					})
				};
				messages.push(message);
				watchCallbacks[message.requestId] = {resolve, reject, callback};
				sendMessages();
			});
		}

		function _close() {
			//TODO reject all callbacks that have not resolved
			//Clear everything
			messages = [];
			httpCallbacks = {};
			watchCallbacks = {};
			//Close socket
			socket.close();
		}

		return {
			url,
			http: _http,
			close: _close,
			watch: _watch
		}
	})
}

module.exports = websocket;
