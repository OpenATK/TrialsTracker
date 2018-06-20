import PouchDB from 'pouchdb'
import _ from 'lodash'
import url from 'url'
import pointer from 'json-pointer'
PouchDB.plugin(require('pouchdb-upsert'));
let db;
let request;
let expiration;

//TODO: Deleting notes doesn't seem to properly delete the note via the cache,
// likely due to my change on line 40.
// Deleting stuff seems to cause NOT COMPLeTE OBJECTs left and right
// Also, deleting /bookmarks/notes/test (path leftover) wasn't behaving as it
// should, either.
// Also, I think the oada module should make an effort to fix the oada state 
// after a delete as part of the oada.delete sequence

// Delete had been working because we would unset the child from its parent, and
// then we would reGET everything from the db.

// Handle delete vs put
// handle pathleftover vs resource manipulation
// Handle resource already exists for doesn't
//


async function dbUpsert(req, res) {
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
	try {
		let result = await db.get(resourceId)
		dbPut._rev = result._rev
		if (req.method && req.method.toLowerCase() === 'delete') {
			dbPut.doc.doc =	(dbPut.doc.doc || {});
		} else {
			if (pathLeftover) {
				// merge the new data into the old at the path leftover, then return old
				let curData = pointer.get(result.doc.doc, pathLeftover);
				let newData = _.merge(curData, res.data || {})
				pointer.set(result.doc.doc, pathLeftover, newData);
				dbPut.doc.doc = result.doc.doc;
			} else dbPut.doc.doc = _.merge(result.doc.doc, res.data || {});
		}
	} catch(e) {
		console.log(e)
		// Resource was not in db.		
		if (req.method && req.method.toLowerCase() === 'delete') {
			// Deleting a resource that doesn't exist: do nothing.
		} else {
			if (pathLeftover) {
				//Execute the PUT and Warn users that the data is incomplete
				let doc = {_NOT_COMPLETE_RESOURCE: true};
				pointer.set(doc, pathLeftover, res.data);
				dbPut.doc.doc = doc;
			}
			dbPut.doc.doc = res.data;
		}
	}
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
		return
	})
}

function getResFromServer(req) {
	return request({
		method: 'GET',
		url: req.url,
		headers: req.headers
	}).then((res) => {
		return dbUpsert(req, res)
	}).catch((err) => {
		console.log(err)
		return 
	})
}

function getResFromDb(req, force) {
	console.log(req)
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
			console.log(data)
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
	console.log(req)
	let urlObj = url.parse(req.url)
	if (/^\/resources/.test(urlObj.path)) {
		return getResFromDb(req)
	} else {
		// First lookup the resourceId in the cache
		return getLookup(req).then((result) => {
			console.log(result)
			// Now see if the resource is, in fact, already in the cache (may not have
			// known associated resource_id before returning from oada
			return getResFromDb({
				headers: req.headers, 
				url: urlObj.protocol+'//'+urlObj.host+'/'+result.doc.resourceId+result.doc.pathLeftover
			})
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
			return
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
		return dbUpsert({
			url: urlObj.protocol+'//'+urlObj.host+'/'+resourceId+pathLeftover,
			headers: req.headers
		}, {
			data: undefined,
			_valid: false,
			headers: { 'x-oada-rev': _rev},
		}).then(() => {
			// Now get the data to bring it back into the cache
			return get({
				headers: req.headers, 
				url: urlObj.protocol+'//'+urlObj.host+'/'+resourceId+pathLeftover,
				method: 'get'
			})
		})
	})
}

async function deleteCheckParent(req, res) {
	let urlObj = url.parse(req.url)
	let _rev = res.headers['x-oada-rev'];
	let lookup;
	try {
		let reqPieces = urlObj.path.split('/')
		lookup = await getLookup({
			url: urlObj.protocol+'//'+urlObj.host+reqPieces.slice(0, reqPieces.length-1).join('/'),
			headers: req.headers
		})
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
		return
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
	let urlObj = url.parse(req.url)
	return request(req).then((response) => {
		return dbDelete(req, response)
	}).catch(() => {
		// Handle offline case
		return 
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
