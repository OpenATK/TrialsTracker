const Promise = require('bluebird')
const uuid = require('uuid')
const axios = require('axios')
const _ = require('lodash')
const pointer = require('json-pointer')
const URL = require('url')

function oadaRequest(req, websocket) {
	let reqHost = URL.parse(req.url).host;
	let request;
	if (websocket === null || URL.parse(websocket.url).host !== reqHost) {
		request = axios
	} else {
	  req.url = req.url.replace('https://', 'wss://').replace('http://', 'ws://');
    req.url = req.url.indexOf('ws') !== 0 ? req.url + 'wss://' : req.url;
		request = websocket.http
	}
	return request(req).then((response) => { 
		return response
	})
}

function recursiveGet(domain, token, pathString, setupTree, headers, websocket) {
	let returnData = {};
	return websocket.cache.get(domain, token, pathString).then((result) => {
		returnData = result;
		return Promise.map(Object.keys(setupTree), (key) => {
      if (key.charAt(0) === '_') return false;
// If setupTree contains a *, this means we should get ALL content on the server
// at this level and continue recursion for each returned key.
			if (key === '*') {
  			return Promise.map(Object.keys(result), (resKey) => {
  				return recursiveGet(domain, token, pathString+'/'+resKey, setupTree[key], headers, websocket).then((res) => {
            return returnData[resKey] = res;
  				})
  			})
			} else {
        if (result[key]) {
	  		  return recursiveGet(domain, token, pathString+'/'+key, setupTree[key], headers, websocket).then((res) => {
            return returnData[key] = res;
			    })
				}
				return
			}
		})
	}).then(() => {
		return returnData
	})
}
	/*
function treePut(domain, token, pathString, data, setupTree, websocket, prefix) {
	let puts = [];
	let pathArray = pointer.parse(pathString)
	let setupPathArray = pathArray.slice(); 
	return Promise.each(pathArray, (piece, i) => {
		// If a * occurs at this position in the setupTree, replace current element
		// with a * so it can be checked against the setupTree
		let setupPath = pointer.compile(setupPathArray.slice(0, i+1));
		if (pointer.has(setupTree, setupPath+'/*')) {
			setupPathArray[i+1] = '*';
		}

		let type = setupPath+'/_type';
		//Return if not a resource
		if (!pointer.has(setupTree, type)) return true
		let path = pointer.compile(pathArray.slice(0, i+1));
		let contentType = pointer.get(setupTree, type);
		let body = pointer.get(setupTree, setupPath);
		body = replaceLinks(body, body)
		if (i === pathArray.length-1) {
      Object.assign(body, data)
		}
		//If it already exists, update it, else create resource
    return oadaRequest({
			method: 'GET',
			url: 'https://'+domain+prefix+path,
			headers: {
				Authorization: 'Bearer '+token
			}
		}, websocket).then((result) => {
			if (result.status === 200) {//pointer.has(setupTree, path+'/_id')) {
				return oadaRequest({
					method: 'PUT',
					url: 'https://'+domain+prefix+path,
					data: body,
					headers: {
						Authorization: 'Bearer '+token, 
						'Content-Type': contentType
					}
				}, websocket)
			} 
			return true
		}).catch((error) => {
      if (error.response.status === 404) {
	  		return createResource(domain, token, prefix+path, body, {'Content-Type': contentType}, websocket).then((response) => {
					return puts.push({path, response})
				})
			} 
			return true
		})
  }).then(() => {
	  //Update the tree with any new ids
    return puts;
	})
}
*/

function createResource(domain, token, path, data, headers, websocket) {
	/*
	  - Create a resource on an OADA cloud
	*/
// Remove the path if we are running in function mode, so paths in original 
	// action work
	let req = {
		method: 'POST',
		url: 'https://'+domain+'/resources',
    data,
		headers: _.merge({Authorization: 'Bearer '+token}, headers),
	}

	return oadaRequest(req, websocket).then((response) => {
    var id = response.headers.location.split('/')
		id = id[id.length-1]
		req = {
			method: 'PUT',
			url: 'https://'+domain+path,
			data: {_id:'resources/'+id, _rev: '0-0'},
			headers: _.merge({Authorization: 'Bearer '+token}, headers),
		}
    return oadaRequest(req, websocket)
  });
}

function replaceLinks(desc, example) {
  let ret = (Array.isArray(example)) ? [] : {};
  if (!desc) return example;  // no defined descriptors for this level
  Object.keys(example).forEach(function(key, idx) {
		if (key === '*') { // Don't put *s into oada. Ignore them 
			return;
		}
		let val = example[key];
    if (typeof val !== 'object' || !val) {
      ret[key] = val; // keep it asntType: 'application/vnd.oada.harvest.1+json'
      return;
		}
		if (val._id) { // If it's an object, and has an '_id', make it a link from descriptor
      ret[key] = { _id: desc[key]._id, _rev: '0-0' };
      return;
    }
    ret[key] = replaceLinks(desc[key],val); // otherwise, recurse into the object looking for more links
  });
  return ret;
}

function recursiveStuff(domain, token, websocket, fullPathArray, i, data, tree) {
	// If a * occurs at this position in the setupTree, replace current element
	// with a * so it can be checked against the setupTree
	let currentPathArray = fullPathArray.slice(0, i+1)
	let currentPath = pointer.compile(currentPathArray)
	let nextPiece = fullPathArray[i+1];
  let nextPathArray = fullPathArray.slice(0, i+2)
	if (nextPiece) {
	  console.log('YIELD TILER AAAAAA')
		console.log('has star?', pointer.has(tree, currentPath+'/*'), currentPath+'/*')
		//Update the tree by duplicating content below * for the nextPiece key
		//Its this copying of the * tree that can get us into trouble.
		if (pointer.has(tree, currentPath+'/*')) {
			let nextPath = pointer.compile(nextPathArray)
			console.log('nextPath', nextPath)
			if (!pointer.has(tree, nextPath)) {
				let p = _.cloneDeep(pointer.get(tree, currentPath+'/*'));
				console.log('about to set ', nextPath, 'to', p)
				pointer.set(tree, nextPath, p)
				//				pointer.remove(tree, currentPath+'/*')
			}
		}
		return recursiveStuff(domain, token, websocket, fullPathArray, i+1, data, tree).then((result) => {
			//			return stuffToDo(domain, token, websocket, currentPath, result, i<fullPathArray.length-1, tree)
		})
	}
	console.log('YIELD TILER BBBBBB', currentPath)
	// Last part of the given path, PUT the data
	let merged = _.cloneDeep(pointer.get(tree, currentPath))
	console.log('merged', merged)
	_.merge(merged, data)
	pointer.set(tree, currentPath, merged)
	console.log('merged 2', pointer.get(tree, currentPath))
	//	return stuffToDo(domain, token, websocket, currentPath, i<fullPathArray.length-1, tree)
}

	/*
async function stuffToDo(domain, token, websocket, currentPath, maxDepth, tree) {
  console.log('currentPath', currentPath)
	// Only generate write requests for resources
	let type = currentPath+'/_type';
	if (pointer.has(tree, type)) {
		let contentType = pointer.get(tree, type);
		let path = '/bookmarks'+currentPath;
		// If the resource already exists, write links to potentially new children
    return oadaRequest({
			method: 'HEAD',
			url: 'https://'+domain+path,
			headers: {
				Authorization: 'Bearer '+token
			}
		}, websocket).then((result) => {
    	let idPath = currentPath+'/_id';
			// _id of the resource should be the current _id if it already exists or 
			// if a write is already pending. It could've already made in previous
			// geohash-length processing
			let resId = result.headers._id : (pointer.has(tree, idPath) ? pointer.get(tree, idPath) : 'resources/'+uuid.v4());
			console.log('setting _id', resId, idPath)
			pointer.set(tree, idPath, resId)

			let body = _.cloneDeep(pointer.get(tree, currentPath))
			body = replaceLinks(body, body);
			console.log('body', body)

			// Write to resources that already exist anyways to ensure that links
			// get made properly. They should merge in without issue.
			return oadaRequest({
				method: 'PUT',
				url: 'https://'+domain+path,
				headers: {
					Authorization: 'Bearer '+token,
					'Content-Type': contentType,
				},
				data: body,
			}, websocket)
		}).catch((err) => {
			//HEAD request failed, if it was simply 404, create the resource
	  	return createResource(domain, token, path, body, {'Content-Type': contentType}, websocket)
		})
	}
	//Not a resource, just return an object with the parent resource linked
	return
}
*/

module.exports = {
	createResource,
	oadaRequest,
	recursiveGet
}
