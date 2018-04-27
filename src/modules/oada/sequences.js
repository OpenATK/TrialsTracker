import {
	getToken,
} from './factories'
import { props, state } from 'cerebral/tags';
import { set } from 'cerebral/operators';
import { sequence } from 'cerebral';

export let postAndLink = sequence('oada.init', [
	({state, oada, props, path}) => {
		return oada.post({
			url: state.get('oada.domain')+'/resources',
			token: state.get('oada.token'),
			data: props.data,
			contentType: props.contentType
		}).then((result) => {
			let _id = result.headers.location.replace(/^\/resources/, '');
			let data = {
				_id
			};
			if (result.data._rev) data._rev = result.data._rev
			return oada.put({
				data,
				contentType: props.contentType,
				token: state.get('oada.domain'),
				url: state.get('oada.domain')+props.path+_id
			}).then(() => {
				return oada.get({
					url: state.get('oada.domain')+props.path+_id,
					token: state.get('oada.domain')
				}).then((response) => {
					return path.success({result: response.data})
				})
			})
		}).catch((error) => {
			return path.error({})
		})
	}, {
		success: [
		],
		error: []
	}
])

export let init = sequence('oada.init', [
])

export let authorize = sequence('oada.authorize', [
	({state, oada, path}) => { 
		return oada.authorize({
			domain: state.get('oada.hostname'), 
			options: state.get('oada.options')
		}).then((response) => {
			return path.authorized({token:response.accessToken})
		}).catch(() => {
			return path.unauthorized({})
		})
	}, {
		authorized: [
			set(state`oada.token`, props`token`),
			set(state`oada.isAuthenticated`, true),
		],
		unauthorized: [
			set(state`oada.isAuthenticated`, false),
			set(state`error`, props`error`)
		],
	}
])

export let fetchTree = [
	({props, state}) => ({
		token: state.get('oada.token'),
		url: state.get('oada.domain')+'/'+props.path,
	}),
	fetch, {
		success: [
			({state, props}) => {
				let path = props.path.split('/').join('.');
				state.set(path, props.result);
			},
		],
		error: []
	},
]

export let get = [
	({oada, state, props}) => {
		return oada.get({
			url: state.get('oada.domain')+'/'+props.path,
			token: state.get('oada.token')
		}).then((res) => {
			return res
		})
	}
]

export const put = sequence('oada.put', [
	({oada, state, props}) => {
		return oada.put({
			url: state.get('oada.domain')+'/'+props.path,
			contentType: props.contentType,
			data: props.data,
			token: state.get('oada.token'),
		}).then((response) => {
			return	oada.get().then((res) => {
				return res
			})
		}).catch((error) => {
			return error
		})
	}
])

export const post = [
	({props, state, oada}) => {
		return oada.post({
			url: state.get('oada.domain')+'/resources',
			contentType: props.contentType,
			data: props.data,
			token: state.get('oada.token'),
		}).then((response) => {
			return	oada.get().then((res) => {
				return res
			})
		}).catch((error) => {
			return error
		})
	}
]

function fetch({oada, state, path}) {
	let recursiveGet = (url, token, obj) => {
		return Promise.map(Object.keys(obj) || {}, (key) => {
			if (obj[key] !== null && typeof obj[key] === 'object') {
				if (key.charAt(0) === '_') return;
				// If the key is linked, follow it in oada
				if (obj[key]._id) {
					return oada.get({
						url: url+'/'+key,
						token
					}).then((res) => {
						obj[key] = res.data;
						return recursiveGet(obj[key], path+'/'+key)
					})
				// else traverse it as you would a normal object
				} else {
					return recursiveGet(obj[key], path+'/'+key)
				}
				return;
			}
			return;
		})
	}

	return oada.get({
		url: props.url,
		token: props.token
	}).then((response) => {
		console.log('1', response)
		return recursiveGet(props.url, props.token, response.data).then((result) => {
			return path.success({result})
		}).catch((error) => {
			return path.error({error})
		})
	}).catch((error) => {
		return path.error({})
	})
}
