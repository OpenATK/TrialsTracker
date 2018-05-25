import { Provider } from 'cerebral'
import websocket from './websocket'
import Promise from 'bluebird'
import axios from 'axios'
import {
	getToken
} from '../../modules/oada/factories'
import { configureCache } from './cache'
let cache;
let getAccessToken = Promise.promisify(require('oada-id-client').getAccessToken)

let isAuthorized = false;
let request = axios;

//TODO: eliminate redundant code regarding requests. We pass in the method, so
// there is no need for individual functions for each.

export default Provider ({

	authorize: ({domain, options}) => {
		//Get token from the cache
		//Else get token
		return getAccessToken(domain, options).then((result) => {
			return {accessToken: result.access_token}
		})
	},
	
	get: ({url, token}) => {
		let req = {
			method: 'get',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		}
		console.log('ACCESSING CACHE')
		if (cache.get) return cache.get(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	put: ({url, token, contentType, data}) => {
		let req = {
			method: 'put',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data,
		}
		if (cache.put) return cache.put(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	post: ({url, token, contentType, data}) => {
		let req = {
			method: 'post',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data
		}
		if (cache.post) return cache.post(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	delete: ({url, token}) => {
		let req = {
			method: 'delete',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		}
		if (cache.delete) return cache.delete(req)
		return request(req).then((result) => { 
			return {
				data: result.data,
				_rev: result._rev || result.headers['x-oada-rev'],
				location: result._id || result.headers['content-location']
			}
		})
	},

	configureCache: ({name}) => {
		return configureCache(name, request).then((result) => {
			cache = result
		})
	},

	clearCache: async () => {
		await cache.clearCache();
		cache = {};
		return
	},

	configureWs: ({url}) => {
		//Set request variable to websocket.http
		//If theres already a websocket connection, do something?

		return websocket(url).then((socketApi) => {
			request = socketApi.http;
			return socketApi
		})
	},

//TODO: implement in http as timer-based ping of updates
	watch: ({url, fn}) => {
		//check for websocket
	}
})
