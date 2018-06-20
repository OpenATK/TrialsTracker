import { Provider } from 'cerebral'
import urlLib from 'url'
import websocket from './websocket'
import Promise from 'bluebird'
import axios from 'axios'
import {
	getToken
} from '../../modules/oada/factories'
import { configureCache } from './cache'
let cache;
let getAccessToken = Promise.promisify(require('oada-id-client').getAccessToken)
let watches = {};

let isAuthorized = false;
let request = axios;
let socket;

export default Provider ({

	authorize({domain, options}) {
		//Get token from the cache
		//Else get token
		return getAccessToken(domain, options).then((result) => {
			return {accessToken: result.access_token}
		}).catch((err) => {
			console.log(err)
		})
	},
	
	get({url, token}) {
		console.log(url, token)
		let req = {
			method: 'get',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		}
		if (cache) return cache.get(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	put({url, token, contentType, data}) {
		let req = {
			method: 'put',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data,
		}
		if (cache) return cache.put(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	post({url, token, contentType, data}) {
		let req = {
			method: 'post',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data
		}
		if (cache && cache.post) return cache.post(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	delete({url, token}) {
		let req = {
			method: 'delete',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		}
		if (cache) return cache.delete(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	configureCache({name}) {
		return configureCache(name, request).then((result) => {
			cache = result
			return
		})
	},

	async clearCache () {
		await cache.clearCache();
		cache = {};
		return
	},

	configureWs({url}) {
		return websocket(url).then((socketApi) => {
			request = socketApi.http;
			return socket = socketApi;
		})
	},

	resetWs({url}) {
		if (socket) {
			socket.close();
			socket = undefined;
			return this.configureWs({url})
		}
	},

	watch({url, token, signalName, payload}) {
		let headers = {Authorization: 'Bearer '+token};
		let urlObj = urlLib.parse(url)
		let signal = this.context.controller.getSignal(signalName);
		if (request === axios) {
			// Ping a normal GET every 5 seconds in the absense of a websocket
			// TODO: Perhaps supply a _rev to check for change beyond?? Query needs to
			// be written to handle this scenario.
			/*
			return setInterval(async () => {
				this.get({url, token}).then((response) => {
					// TODO: handle stuff.  Get changes??
					payload.response = response;
					payload.request = {
						url,
						headers
						method: payload.response.change.type
					}
					if (cache) await cache.handleWatchChange(payload)
					signal(payload)
				})
			}, 5000)
			*/
		} else {
			return socket.watch({
				url: urlObj.path,
				headers,
			}, async function watchResponse(response) {
				if (!payload) payload = {};
				payload.response = response;
				payload.request = {
					url,
					headers,
					method: payload.response.change.type,
				}
				if (cache) await cache.handleWatchChange(payload)
				return signal(payload)
			})
		}
	},
})
