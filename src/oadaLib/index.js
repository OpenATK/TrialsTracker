import configureCache from './cache'
var urlLib = require('url');
var pointer = require('json-pointer');
var websocket = require('./websocket');
var Promise = require('bluebird');
var axios = require('axios');
//var configureCache = require('./cache');
console.log(configureCache);
let getAccessToken = Promise.promisify(require('oada-id-client').getAccessToken)
let _ = require('lodash');
let cache;
let watches = {};

let isAuthorized = false;
let request = axios;
let socket;
let _token;
let _domain;
let TREE = {};

var authorize = function({domain, options}) {
	//Get token from the cache
	//Else get token
	return getAccessToken(domain, options).then((result) => {
		_token = result.access_token;
		return {accessToken: _token}
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
	return request(req)/*.then((result) => {
		return {
			data: result.data,
			_rev: result._rev || result.headers['x-oada-rev'],
			location: result._id || result.headers['content-location']
		}
	})
	*/
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
	return request(req)/*.then((result) => { 
		//TODO: MUST FIGURE OUT RETURN CONTENT
		return {
			data: result.data,
			_rev: result._rev || result.headers['x-oada-rev'],
			location: result._id || result.headers['content-location']
		}
	})*/

		.catch((err) => {
			console.log('123', err)
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
	console.log('posting')
	return request(req)/*.then((result) => { 
		return {
			data: result.data,
			_rev: result._rev || result.headers['x-oada-rev'],
			location: result._id || result.headers['content-location']
		}
	})
	*/
}

var	del = function({url, token}) {
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
  /*
var configureCache = function({name}) {
	return configureCache(name, request).then((result) => {
		cache = result
		return
	})
}
*/

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

function replaceLinks(obj) {
	let ret = (Array.isArray(obj)) ? [] : {};
	if (!obj) return obj;  // no defined objriptors for this level
	return Promise.map(Object.keys(obj || {}), (key)  => {
		if (key === '*') { // Don't put *s into oada. Ignore them
			return;
		}
		let val = obj[key];
		if (typeof val !== 'object' || !val) {
			ret[key] = val; // keep it asntType: 'application/vnd.oada.harvest.1+json'
			return;
		}
		if (val._type) { // If it has a '_type' key, don't worry about it.
			//It'll get created in future iterations of ensureTreeExists
			return;
		}
		if (val._id) { // If it's an object, and has an '_id', make it a link from descriptor
			ret[key] = { _id: obj[key]._id};
			if (val._rev) ret[key]._rev = '0-0'
			return;
		}
		// otherwise, recurse into the object looking for more links
		return replaceLinks(val).then((result) => {
			ret[key] = result;
			return;
		})
	}).then(() => {
		return ret;
	})
}

	/*
let recursiveSmartPut = (url, setupTree, returnData) => {
	console.log(url, setupTree, returnData)
	return Promise.try(() => {
		// Perform a GET if we have reached the next resource break.
		if (setupTree._type) { // its a resource
			console.log(url, 'is a resource. awaiting')
			return get({
				url,
				token: props.token 
			}).then((response) => {
				console.log(url, 'finished getting', response.data)
				returnData = response.data;
				return
			})
		}
		return
	}).then(() => {
		// Walk down the data at this url and continue recursion.
		console.log(url, 'proceeding')
		return Promise.map(Object.keys(setupTree), (key) => {
			console.log(url, 'KEY', key)
			// If setupTree contains a *, this means we should get ALL content on the server
			// at this level and continue recursion for each returned key.
			if (key === '*') {
				console.log(url, 'found star')
				return Promise.map(Object.keys(returnData), (resKey) => {
					if (resKey.charAt(0) === '_') return
					return recursiveSmartPut(url+'/'+resKey, setupTree[key] || {}, returnData[key]).then((res) => {
						return returnData[resKey] = res;
					})
				})
			} else if (typeof setupTree[key] === 'object') {
				console.log('in here', key, props.token)
				return recursiveSmartPut(url+'/'+key, setupTree[key] || {}, returnData[key]).then((res) => {
					return returnData[key] = res;
				})
			} else return returnData[key]
		}).then(() => {
			return returnData
		})
	}).catch((err) => {
		console.log(err)
		console.log(err.response)
		// Put the data on the server and try to GET it over again. The 
		// replaceLinks function will create all of the data down to the next 
		// resource and we don't want to recursively and redundantly PUT key by 
		// key all the way down. We just want to skip from one resource down to 
		// the next.
		if (err.response.status === 404) {
			console.log(setupTree)
			return replaceLinks(setupTree).then((data) => {
				console.log('PUTTING', url, setupTree._type, data)
				return makeResourceAndLink({
					token: props.token,
					url,
					data
				})
			}).then(() => {
				return recursiveSmartPut(url, setupTree, returnData)
			})
		}
		throw err
	})
}

let smartPut = ({url, setupTree, cachedTree}) => {
	return recursiveInitialize(url, setupTree, knowTree)
}
*/

function findDeepestResources(pieces, setupTree, cachedTree, token, domain) {
	let cached = 0;
	let setup;
	// Walk down the url in reverse order
	return Promise.mapSeries(pieces, (piece, i) => {
		let z = pieces.length - 1 - i; //
		let urlPath = '/'+pieces.slice(0, z+1).join('/');
		let setupTreePath = convertSetupTreePath(pieces.slice(0, z+1), setupTree);
		// Check that its in the cached tree then look for deepest _resource_.
		// If successful, break from the loop by throwing
		if (pointer.has(setupTree, setupTreePath+'/_type')) {
			setup = setup || z;
			if (pointer.has(cachedTree, urlPath)) {
				cached = z;
				throw z;
			}
			return get({
				token,
				url: domain+urlPath
			}).then((response) => {
				pointer.set(cachedTree, urlPath, {})
				cached = z;
				throw z;
			}).catch((err) => {
				if (typeof err === 'number') throw z;
				return
			})
		}
		return
	}).catch((err) => {
		// Throwing with a number error only should occur on successful try.
		if (typeof err === 'number') return { cached, setup }
	}).then(() => {
		return { 
			cached: cached, 
			setup: setup || 0
		}
	})
}

// Ensure all resources down to the deepest resource are created before
// performing a PUT.
let smartPut = ({url, setupTree, data, token}) => {
	//If /resources
	
	//If /bookmarks
	let urlObj = urlLib.parse(url);
	let domain = urlObj.protocol+'//'+urlObj.host;
	let path = urlObj.path;
	path = path.replace(/^\//, '');
	let pieces = path.replace(/\/$/, '').split('/');
	let obj = {};
	// Find the deepest part of the path that exists. Once found, work back down.
	return findDeepestResources(pieces, setupTree, TREE, token, domain).then((ret) => {
		// Create all the resources on the way down. ret.cached is an index. Subtract
		// one from pieces.length so its in terms of an index as well.
		return Promise.mapSeries(pieces.slice(0, pieces.length - 1 - ret.cached), (piece, j) => {
			let i = ret.cached+1 + j; // ret.cached exists; add one to continue beyond.
			let urlPath = '/'+pieces.slice(0, i+1).join('/');
			let setupTreePath = convertSetupTreePath(pieces.slice(0, i+1), setupTree);
			if (pointer.has(setupTree, setupTreePath+'/_type') && i <= ret.setup) { // its a resource
				return replaceLinks(pointer.get(setupTree, setupTreePath)).then((content) => {
					return makeResourceAndLink({
						token,
						url: urlObj.protocol+'//'+urlObj.host+urlPath,
						data: content
					}).then(() => {
						pointer.set(TREE, urlPath, content)
						return
					})
				})
			} else return
		}).then(() => {
			// Finally, PUT to the deepest resource with the data (upsert)
			// We're not putting data into the cached tree. It only needs to know about
			// resource ids, not underlying data itself.
			return put({
				url,
				'Content-Type': data._type,
				data,
				token,
			})
		})
	}).catch((err) => {
		console.log(err);
		return err
	})
}

// Loop over the keys of the path and determine whether the object at that level
// contains a * key. The path must be updated along the way, replacing *s as 
// necessary.
function convertSetupTreePath(pathPieces, setupTree) {
	let newPieces = _.clone(pathPieces);
	newPieces =	pathPieces.map((piece, i) => {
		if (pointer.has(setupTree, '/'+newPieces.slice(0, i).join('/')+'/*')) {
			newPieces[i] = '*';
			return '*';
		} else {
			return piece
		}
	})
	return '/'+newPieces.join('/')
}

function makeResourceAndLink({token, url, data}) {
	console.log('NEW:', url)
	let urlObj = urlLib.parse(url);
	let domain = urlObj.protocol+'//'+urlObj.host;
	let req = {
		url: data._id ? domain+'/'+data._id : domain+'/resources',
		contentType: data._type,
		data,
		token,
	}
	let resource = data._id ? put(req) : post(req);
	return resource.then((response) => {
		data._id = response.headers['content-location'].replace(/^\//, '');
		let link = {
			url,
			'Content-Type': data._type,
			data: {_id:data._id},
			token,
		}
		if (data._rev) link.data._rev = '0-0'
		return put(link)
	}).catch((err) => {
		console.log(err)
	})
}

export default {
  authorize,
	get,
	delete: del,
	put,
	post,
	resetWs,
	configureWs,
  configureCache,
	clearCache,
	watch,
	smartPut,
}
