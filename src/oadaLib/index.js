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

var authorize = function({domain, options}) {
		//Get token from the cache
		//Else get token
		return getAccessToken(domain, options).then((result) => {
			return {accessToken: result.access_token}
		}).catch((err) => {
			console.log(err)
		})
	};
	
var get = function({url, token}) {
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
}

var	put = function({url, token, contentType, data}) {
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
}

var	post = function({url, token, contentType, data}) {
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
}

var	delete = function({url, token}) {
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
}

var configureCache = function({name}) {
	return configureCache(name, request).then((result) => {
		cache = result
		return
	})
}

var clearCache = async function() {
	await cache.clearCache();
	cache = {};
	return
}

var configureWs = function({url}) {
	return websocket(url).then((socketApi) => {
		request = socketApi.http;
		return socket = socketApi;
	})
}

var resetWs = function({url}) {
	if (socket) {
		socket.close();
		socket = undefined;
		return this.configureWs({url})
	}
}

var watch = function({url, token, func, payload}) {
	let headers = {Authorization: 'Bearer '+token};
	let urlObj = urlLib.parse(url)
	if (request === axios) {
		// Ping a normal GET every 5 seconds in the absense of a websocket
		return setInterval(() => {
			this.get({url, token}).then((result) => {
				func(payload)
			})
		}, 5000)
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
			return func(payload)
		})
	}
}

var recursiveGet = function ({url, setupTree, request}) {                          
  return get({                                                              
    url,                                                                         
    token: props.token                                                           
  }).then((response) => {                                                        
    let returnData = response.data;                                              
    return Promise.map(Object.keys(setupTree), (key) => {                        
    //return Promise.map(Object.keys(setupTree || returnData), (key) => {        
      //if (key === '_type') return                                              
      // If setupTree contains a *, this means we should get ALL content on the server
      // at this level and continue recursion for each returned key.             
      if (key === '*') {                                                         
        return Promise.mapSeries(Object.keys(returnData), (resKey) => {          
          if (resKey.charAt(0) === '_') return                                   
          console.log('getting ', resKey)                                        
          return recursiveGet(url+'/'+resKey, setupTree[key] || {}).then((res) => {
            console.log('saving', url+'/'+resKey, returnData, res)                
            return returnData[resKey] = res;                                     
          })                                                                     
        })                                                                       
      } else {                                                                   
        return recursiveGet(url+'/'+key, setupTree[key] || {}).then((res) => {   
          console.log('saving', url+'/'+key)                                     
          return returnData[key] = res;                                          
        })                                                                       
      }                                                                          
    }).then(() => {                                                              
      return returnData                                                          
    })                                                                           
  }).catch((err) => {                                                            
    // 404s and such handled here. This will return an empty string as its data  
    return                                                                       
  })                                                                             
}                                                                                

export {
	get,
	delete,
	put,
	post,
	resetWs,
	configureWs,
	configureCache,
	clearCache,
	watch
}
