import PouchDB from 'pouchdb'
import _ from 'lodash'
import url from 'url'
import pointer from 'json-pointer'
PouchDB.plugin(require('pouchdb-upsert'));
let db;
let request;
let expiration;

//TODO: Handle _NOT_COMPLETE_RESOURCE

//Four modes of GET failure with unique solutions
// 1. url lookup wasn't in pouch
// -- GET from OADA and store it all
// 2. resourceId wasn't in pouch
// -- Shouldn't happen; GET from oada, find resourceId, and put in cache
// 3. pathLeftover didn't exist for resource
// -- GET from OADA, json-pointer set it to the pouch resource
// 4. Wasn't on OADA server
// -- Not much can be done here, return error to user

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
	let doc;
	if (pathLeftover) {
		doc = {_NOT_COMPLETE_RESOURCE: true}
		pointer.set(doc, pathLeftover, res.data)
	} else {
		doc = res.data;
	}
	if (doc) dbPut.doc.doc = doc;
	try {
		let result = await db.get(resourceId)
		dbPut._rev = result._rev
		dbPut.doc.doc = (req.method && req.method.toLowerCase() === 'delete') ? 
			_.merge(result.doc.doc, dbPut.doc.doc || {}) :
			(dbPut.doc.doc || {})
	} catch(e) {
	}
	return db.put(dbPut).then((result) => {
		return getResFromDb(req)
	}).catch((err) => {
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
	}).catch(() => {
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

// Designed after PUT:
// 1. Perform the delete to the server
// 2. invalidate the cache entry for the resource
// 3. invalidate the cache entry for the parent (which MAY retain a link)
// 4. GET the parent to correct the cache
function del(req) {
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
		}).then(async() => {
			// Now, invalidate the parent should it contain a link
			if (!pathLeftover) { // No pathLeftover means it is itself a resource
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
							headers: req.headers
						}, {
							data: undefined,
							_valid: false,
							headers: { 'x-oada-rev': _rev},
						}).then(() => {
							// Now get the data to bring it back into the cache
							return get({
								headers: req.headers, 
								url: parentUrl,
								method: 'get'
							}).then((result) => {
								return;
							})
						})
					} return
				} catch(e) {}
			}
		})
	}).catch(() => {
		// Handle offline case
		return 
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
	})
}
