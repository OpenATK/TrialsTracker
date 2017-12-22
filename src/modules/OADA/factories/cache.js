import axios from 'axios';
import _ from 'lodash';
import PouchDB from 'pouchdb';

function cache(websocket, dbName) {
	let db = new PouchDB(dbName);

	function get(domain, token, resPath) {
		return db.get('/bookmarks'+resPath).then((oadaId) => {
			return db.get(oadaId.doc).then((res) => {
				return res.doc
			})
		}).catch(()=> {
			// Cache lookup failed, try the server
			let url = domain+'/bookmarks'+resPath;
			let request = (websocket === null || websocket.url !== domain) ? axios : websocket.http;
			return request({
				method: 'GET',
				url,
				headers: {
					Authorization: 'Bearer '+token
				}
			}).then((response) => {
	// This checks that we've got a resource here
				if (response.data._id) {
					delete response.data._type
					delete response.data._meta
					let _id = response.data._id.replace(/resources\//, '')
					delete response.data._id
					return db.bulkDocs([{
						_id: '/bookmarks' + resPath,
						doc: _id
					}, {
						_id,
						doc: response.data
					}]).then(() => {
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

	return {
		get,
		db
	}
}

export default cache
