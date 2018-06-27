import PouchDB from 'pouchdb'
import _ from 'lodash'
import url from 'url'
import pointer from 'json-pointer'
PouchDB.plugin(require('pouchdb-upsert'));
let db;
let request;
let expiration;


// Get the resource and merge data if its already in the db.
function getUpsertDoc(req, res) {
	let urlObj = url.parse(req.url)
	let pieces = urlObj.path.split('/')
	let resourceId = pieces.slice(1,3).join('/'); //returns resources/abc
	let pathLeftover = (pieces.length > 3) ? '/'+pieces.slice(3, pieces.length).join('/') : '';
	//If theres a path leftover, create an empty object, add a key to warn users
	//that the data is incomplete, and put the data at that path Leftover
	let dbPut = {
		_id: resourceId,
		doc: {
			_valid: (res._valid === undefined) ? true : res._valid,
			_accessed: Date.now(),
		}
	}
	console.log(resourceId)
	return db.get(resourceId).then((result) => {
		if (result.doc._NOT_COMPLETE_RESOURCE) dbPut.doc._NOT_COMPLETE_RESOURCE = true;
		dbPut._rev = result._rev
		if (req.method && req.method.toLowerCase() === 'delete') {
			dbPut.doc.doc =	(dbPut.doc.doc || {});
		} else {
			if (pathLeftover) {
				// merge the new data into the old at the path leftover, then return old
				let curData = {}
				try { // If the path doesn't exist in the db doc, make an empty object.
					curData = pointer.get(result.doc.doc, pathLeftover);
				} catch(err) {}
				let newData = _.merge(curData, res.data || {})
				console.log(result)
				pointer.set(result.doc.doc, pathLeftover, newData);
				dbPut.doc.doc = result.doc.doc;
			} else dbPut.doc.doc = _.merge(result.doc.doc, res.data || {});
		}
		return dbPut
	}).catch((e) => { // Else, resource was not in the db. 
		console.log(e)
		if (req.method && req.method.toLowerCase() === 'delete') {
			// Deleting a resource that doesn't exist: do nothing.
		} else {
			if (pathLeftover) {
				//Execute the PUT and Warn users that the data is incomplete
				let doc = {};
				dbPut.doc._NOT_COMPLETE_RESOURCE = true;
				console.log(doc, pathLeftover, res.data)
				pointer.set(doc, pathLeftover, _.clone(res.data));
				dbPut.doc.doc = doc;
				console.log("DDDDDDBPUUUT", doc)
				console.log("DDDDDDBPUUUT", dbPut)
			} else dbPut.doc.doc = res.data;
		}
		console.log("UUUT", dbPut)
		return dbPut
	})
}

function dbUpsert(req, res) {
	return getUpsertDoc(req, res).then((dbPut) => {
		console.log('DBPUT', dbPut)
		return db.put(dbPut).then((result) => {
			return getResFromDb(req)
		}).catch((err) => {
			console.log(err)
			if (err.name === 'conflict') {
				//TODO: avoid infinite loops with this type of call
				// If there is a conflict in the lookup, repeat the lookup (the HEAD
				// request likely took too long and the lookup was already created by
				// another simultaneous request
				return dbUpsert(req, res)
			}
			throw err
		})
	})
}

function getResFromServer(req) {
  let newReq = {
		method: 'GET',
		url: req.url,
		headers: req.headers
  }
	return request(newReq).then((res) => {
    console.log('now upserting again', newReq,res)
		return dbUpsert(newReq, res)
	}).catch((err) => {
		console.log(err)
		throw err
	})
}

function getResFromDb(req, force) {
	let urlObj = url.parse(req.url)
	let pieces = urlObj.path.split('/')
	let resourceId = pieces.slice(1,3).join('/'); //returns resources/abc
	let pathLeftover = (pieces.length > 3) ? '/'+pieces.slice(3, pieces.length).join('/') : '';
	return db.get(resourceId).then((resource) => {
		if (force || (resource.doc._accessed+expiration) <= Date.now() || !resource.doc._valid) {
			return getResFromServer(req)
		}
		//If no pathLeftover, it'll just return resource!
		return Promise.try(() => {
			let data = pointer.get(resource.doc.doc, pathLeftover)
			return {
				data,
				_rev: data._rev,
				location: resourceId+pathLeftover
			}
		})
	}).catch((err) => {
		console.log(err)
		return getResFromServer(req)
	})
}

// Accepts an axios-style request. Returns:
// {
//
//   data: the data requested,
//
//   _rev: the rev of the parent resource requested
//
//   location: e.g.: /resources/abc123/some/path/leftover
//   
// }
function get(req, force) {
	console.log('GET!', req)
	let urlObj = url.parse(req.url)
	if (/^\/resources/.test(urlObj.path)) {
		return getResFromDb(req)
	} else {
		// First lookup the resourceId in the cache
		return getLookup(req).then((result) => {
			// Now see if the resource is, in fact, already in the cache (may not have
			// known associated resource_id before returning from oada
			return getResFromDb({
				headers: req.headers, 
				url: urlObj.protocol+'//'+urlObj.host+'/'+result.doc.resourceId+result.doc.pathLeftover
			})
		}).catch((err) => {
			console.log(err);
			throw err
		})
	}
}

function getLookup(req) {
	let urlObj = url.parse(req.url)
	let lookup = urlObj.host+urlObj.path;
	return db.get(lookup)
	//Not found. Go to the oada server, get the associated resource and path 
	//leftover, and save the lookup.
	.catch(() => {
		return request({
			method: 'HEAD',
			url: req.url,
			headers: req.headers
		}).then((response) => {
			//Save the url lookup for future use
			let pieces = response.headers['content-location'].split('/')
			let resourceId = pieces.slice(1,3).join('/'); //returns resources/abc
			let pathLeftover = (pieces.length > 3) ? '/'+pieces.slice(3, pieces.length).join('/') : '';
			return db.put({
				_id: urlObj.host+urlObj.path,
				doc: {
					resourceId,
					pathLeftover
				}
			}).then(() => {
				return getLookup(req)
			}).catch((err) => {
				//TODO: avoid an infinite loop
				if (err.name === 'conflict') {
					// If there is a conflict in the lookup, repeat the lookup (the HEAD
					// request likely took too long and the lookup was already created by
					// another simultaneous request
					return getLookup(req)
				}
			})
		}).catch((e) => {
			console.log(e)
			throw e	
		})
	})
}

// Ping for _rev update
function checkChanges(req) {
	return request({
		method: 'HEAD',
		url: req.url,
		headers: req.headers
	}).then(() => {
		//compare to rev on hand
	})
}

// Create a queue of actual PUTs to make when online.
// Resource breaks are known via setupTree. 
// Do the puts, save out the resource IDs, and return to client
// Create an index on the data to find those that need synced

// Create a service that other apps can run which starts up and periodically 
// checks if a connections has yet been made. A periodic service may also 
// concievably check for updates to cached things.
//
// The cache should go "stale" after some period of time; However, if it cannot
// establish a connection, it should remain valid, usable data.



//TODO: First, get the _rev of the document to check against when the new rev
// is determined.  Also, this function should compensate for a slow return time
// from the PUT operation; it should repeat the GET process until it finds a new
// _rev.
function put(req) {
	let urlObj = url.parse(req.url)
	return request(req).then((response) => {
		let _rev = response.headers['x-oada-rev'];
		let pieces = response.headers['content-location'].split('/')
		let resourceId = pieces.slice(1,3).join('/'); //returns resources/abc
		let pathLeftover = (pieces.length > 3) ? '/'+pieces.slice(3, pieces.length).join('/') : '';
		// Invalidate the resource in the cache (if it is cached)
		console.log(response)
		return dbUpsert({
			url: urlObj.protocol+'//'+urlObj.host+'/'+resourceId+pathLeftover,
			headers: req.headers
		}, {
			data: undefined,
			_valid: false,
			headers: { 'x-oada-rev': _rev},
		}).then(() => {
			// Now get the data to bring it back into the cache. While dbUpsert does 
			// much of this, the lookup has not necessarily been created yet.
			return get({
				headers: req.headers, 
				url: urlObj.protocol+'//'+urlObj.host+'/'+resourceId+pathLeftover,
				method: 'get'
			}).then(() => {
				return response
			})
		})
	})
}

async function deleteCheckParent(req, res) {
	console.log('deleteCheckParent', req, res)
	let urlObj = url.parse(req.url)
	let _rev = res.headers['x-oada-rev'];
	let lookup;
	// Try to get the parent document
	try {
		let reqPieces = urlObj.path.split('/')
		lookup = await getLookup({
			url: urlObj.protocol+'//'+urlObj.host+reqPieces.slice(0, reqPieces.length-1).join('/'),
			headers: req.headers
    })
    console.log(lookup)
		// if the parent document has a known resourceId, nullify the link to the deleted child
		if (lookup && lookup.doc.resourceId) {
			let parentUrl = urlObj.protocol+'//'+urlObj.host+'/'+lookup.doc.resourceId+lookup.doc.pathLeftover;
			return dbUpsert({
				url: parentUrl,
				headers: req.headers,
				method: req.method,
			}, {
				data: undefined,
				_valid: false,
				headers: { 'x-oada-rev': _rev},
			})
		} return
	} catch(e) {
		console.log(e)
		throw e
	}
}

// ALTERNATIVELY, using db.remove:
// 1. Delete at server
// If no pathLeftover
// 2a. Invalidate parent
// 3a. Invalidate child
// 4a. GET parent from server to cache the new, unlinked data
// If pathleftover
// 2b. GET the child to confirm and cache the new state
function dbDelete(req, res) {
	console.log('dbDelete', req, res)
	let urlObj = url.parse(req.url)
	let _rev = res.headers['x-oada-rev'];
	let pieces = res.headers['content-location'].split('/')
	let resourceId = pieces.slice(1,3).join('/'); //returns resources/abc
	let pathLeftover = (pieces.length > 3) ? '/'+pieces.slice(3, pieces.length).join('/') : '';
	// If it is itself a resource, we only need to invalidate the cache entry for
	// the parent (which links to the child)
	if (!pathLeftover) return deleteCheckParent(req, res)
	// Else, invalidate the cache entry for the resource itself
	return dbUpsert({
		url: urlObj.protocol+'//'+urlObj.host+'/'+resourceId+pathLeftover,
		headers: req.headers,
		method: req.method,
	}, {
		data: undefined,
		_valid: false,
		headers: { 'x-oada-rev': _rev},
	})
}

// Issue DELETE to server then update the db
function del(req) {
	console.log('del', req)
	let urlObj = url.parse(req.url)
	return request(req).then((response) => {
		return dbDelete(req, response)
	}).catch((e) => {
		// Handle offline case
		throw e
	})
}

function replaceLinks(obj, req) {
  let ret = (Array.isArray(obj)) ? [] : {};
  if (!obj) return obj;
  Object.keys(obj || {}).forEach(async function(key, i) {
		let val = obj[key];
    if (typeof val !== 'object' || !val) {
      ret[key] = val; // keep it asntType: 'application/vnd.oada.harvest.1+json'
      return;
		}
		if (val._meta) { // If has a '_rev' (i.e, resource), make it a link
			let lookup = await getLookup({
				url: req.url+'/'+key,
				headers: req.headers
			})
			ret[key] = { _id: lookup.doc.resourceId };
			if (obj[key]._rev) ret[key]._rev = obj[key]._rev
      return;
    }
		ret[key] = replaceLinks(obj[key], {
			url: req.url+'/'+key,
			headers: req.headers
		}); // otherwise, recurse into the object
  });
  return ret;
}

export async function recursiveUpsert(req, body) {
	let urlObj = url.parse(req.url);
	if (body._rev) {
		let lookup = await getLookup({
			url: req.url,
			headers: req.headers
		})
		let newBody = replaceLinks(body, {
			url: req.url,
			headers: req.headers
		});
		await dbUpsert({
			url: urlObj.protocol+'//'+urlObj.host+'/'+lookup.doc.resourceId,
			headers: req.headers
		}, {
			data: newBody,
			headers: { 'x-oada-rev': newBody._rev },
		})
	}
	if (typeof body === 'object') {
		return Promise.map(Object.keys(body || {}), (key) => {
			if (key.charAt(0) === '_') return
			if (!body[key]) return
			return recursiveUpsert({
				url: req.url+'/'+key,
				headers: req.headers
			}, body[key])
		})
	} else return
}

export function findNullValue(obj, path, nullPath) {
	if (typeof obj === 'object') {
		return Promise.map(Object.keys(obj || {}), (key) => {
			if (obj[key] === null) {
				nullPath = nullPath + '/' + key;
				return nullPath;
			}
			return findNullValue(obj[key], path+'/'+key, nullPath).then(() => {
				return nullPath
			})
		}).then(() => {
			return nullPath
		})
	}
	return Promise.resolve(nullPath);
}

// Will this handle watches put on keys of a resource? i.e., no _id to be found
export function findDeepestResource(obj, path, deepestResource) {
	if (typeof obj === 'object') {
		return Promise.map(Object.keys(obj || {}), (key) => {
			if (key === '_rev') {
				deepestResource.path = path;
				deepestResource.data = obj;
			} else if (key.charAt(0) === '_') return deepestResource
			return findDeepestResource(obj[key], path+'/'+key, deepestResource).then(() => {
				return deepestResource
			})
		}).then(() => {
			return deepestResource
		})
	}
	return Promise.resolve(deepestResource);
}

export function handleWatchChange(payload) {
	let urlObj = url.parse(payload.request.url)
	// Give the change body an _id so the deepest resource can be found
	payload.response.change.body._id = payload.response.resourceId;
	return findDeepestResource(payload.response.change.body, '', {
		path: '',
		data: payload.response.change.body,
	}).then(async (deepestResource) => {
		switch (payload.response.change.type.toLowerCase()) {
			case 'delete':
			// DELETE: remove the deepest resource from the change body, execute
			// the delete, and recursively update all other revs in the cache
				let nullPath = await findNullValue(deepestResource.data, '', '')
				let lookup = await getLookup({
					url: payload.request.url+deepestResource.path,
					header: payload.request.headers
				})
				return dbDelete({
					url: urlObj.protocol+'//'+urlObj.host+'/'+lookup.doc.resourceId+nullPath,
					headers: payload.request.headers,
					method: payload.request.method
				}, {
					headers: {
						'x-oada-rev': deepestResource.data._rev,
						'content-location':  '/'+lookup.doc.resourceId+nullPath
					}
				}).then(() => {
					// Update revs on all parents all the way down to (BUT OMITTING) the 
					// resource on which was the delete was called.
					pointer.remove(payload.response.change.body, deepestResource.path || '/')
					return recursiveUpsert(payload.request, payload.response.change.body)
				})
				break;
			// Recursively update all of the resources down the returned change body
			case 'merge':
				return recursiveUpsert(payload.request, payload.response.change.body)
				break;

			default:
				return;
		}
	})
}

export async function clearCache() {
	if (db) await db.destroy();
	db = undefined;
	request = undefined;
	expiration = undefined;
}

// name should be made unique across domains and users
export function configureCache(name, req, exp) {
	db = db || new PouchDB(name);
	request = req;
	expiration = exp || 1000*60*60*24*2;//(ms/s)*(s/min)*(min/hr)*(hr/days)*days
	return Promise.resolve({
		get,
		put,
		delete: del,
		db,
		clearCache,
		recursiveUpsert,
		findDeepestResource,
		handleWatchChange,
	})
}
