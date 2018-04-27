import { Provider } from 'cerebral'
import Promise from 'bluebird'
import axios from 'axios'
import {
	getToken
} from '../../modules/oada/factories'
let getAccessToken = Promise.promisify(require('oada-id-client').getAccessToken)

let isAuthorized = false;
let request = axios;
export default Provider ({

	authorize: ({domain, options}) => {
		//Get token from the cache
		//Else get token
		return getAccessToken(domain, options).then((result) => {
			return {accessToken: result.access_token}
		})
	},
	
	get: ({url, token}) => {
		return request({
			method: 'get',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		})
	},

	put: ({url, token, contentType, data}) => {
		return request({
			method: 'put',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data,
		})
	},

	post: ({url, token, contentType, data}) => {
		return request({
			method: 'post',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
				'Content-Type': contentType,
			},
			data
		})
	},

	delete: ({url, token}) => {
		return request({
			method: 'delete',
			url,
			headers: {
				'Authorization': 'Bearer '+token,
			},
		})
	},

	configureWs: () => {
		//Set request variable to websocket.http
		//Expose watch function
	},

	watch: () => {
		//check for websocket
	}
})
