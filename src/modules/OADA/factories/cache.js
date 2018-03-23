import axios from 'axios';
import _ from 'lodash';
import PouchDB from 'pouchdb';

function cache(websocket, dbName) {
	let db = new PouchDB(dbName);

	function get(domain, token, resPath, rev) {
		return db.get('/bookmarks'+resPath).then((oadaId) => {
			return db.get(oadaId.doc).then((res) => {
				return res.doc
			}).catch((err) => {
				throw err
			})
		}).catch((err)=> {
			// Cache lookup failed, try the server
			let url = domain+'/bookmarks'+resPath;
			let request = (websocket === null || websocket.url !== domain) ? axios : websocket.http;
			return axios({
				method: 'GET',
				url,
				headers: {
					Authorization: 'Bearer '+token,
				}
			}).then((response) => {
				// This checks that we've got a resource here
				if (response.headers['content-location']) {
					delete response.data._type
					delete response.data._meta
					let _id = response.headers['content-location'].replace(/\/resources\//, '')
					delete response.data._id
					return db.bulkDocs([{
						_id: '/bookmarks' + resPath,
						doc: _id
					}, {
						_id,
						doc: response.data,
						//						_rev: response.data._rev
					}]).then((res) => {
						return response.data
					}).catch((error) => {
						//          if (error.name === 'conflict') {
							//TODO: at the moment, just assume conflict is due to simultaneous PUTs (this happens at _id: '/bookmarks/' when getting yield and fields simultaneously
						//		return response.data
						//	}
						throw error
					})
				}
				return response.data
			}).catch((error) => {
				throw error;
			})
		})
	}

	function put(resPath, _id, merge) {
		return db.get('/bookmarks'+resPath).then((oadaId) => {
			return db.get(oadaId.doc).then((res) => {
				_.merge(res, merge)
				//Document indeed already exists, we're going to need a _rev to put
				if (!res._rev) throw new Error('document already exists, need _rev to perform pouch put');
				return db.put({
					_id,
					doc: res, 
					_rev: res._rev
				}).then((response) => {
					return response
				}).catch((error) => {
					console.log(error);
					throw error;
				})
			})
		}).catch((err) => {
			//Document doesn't yet exist, create it;
			return db.bulkDocs([{
				_id: '/bookmarks' + resPath,
				doc: _id
			}, {
				_id,
				doc: merge,
			}]).then((response) => {
				return response
			}).catch((error) => {
				console.log(error);
				throw error;
			})
		})
	}

	return {
		put,
		get,
		db
	}
}

export default cache
