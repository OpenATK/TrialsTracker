import {
	getToken,
} from './factories'
import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';

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
		authorized: sequence('authorized', [
			set(state`oada.token`, props`token`),
			set(state`oada.isAuthenticated`, true),
		]),
		unauthorized: sequence('unauthorized', [
			set(state`oada.isAuthenticated`, false),
			set(state`error`, props`error`)
		]),
	}
])

export let init = sequence('oada.init', [
	authorize,
])

export let fetchTree = sequence('oada.fetchTree', [
	({props, state}) => ({
		token: state.get('oada.token'),
		url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
	}),
	fetch, {
		success: sequence('fetchTreeSuccess', [
			({state, props}) => {
				state.unset('oada.'+props.path.split('/').filter(n=>n&&true).join('.'))
				state.set('oada.'+props.path.split('/').filter(n=>n&&true).join('.'), props.result);
			},
		]),
		error: sequence('fetchTreeError', [
		]),
	}
])

export const get = sequence('oada.get', [
	({oada, state, props}) => {
		return oada.get({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			token: state.get('oada.token')
		}).then((res) => {
			return {
				data: res.data,
				cerebralPath: props.path.split('/').filter(n=>n&&true).join('.')
			}
		})
	},
	set(state`oada.${props`cerebralPath`}`, props`data`)
])

export const put = sequence('oada.put', [
	({oada, state, props}) => {
		return oada.put({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			contentType: props.contentType,
			data: props.data,
			token: state.get('oada.token'),
		})
	},
	when(props`path`, (value) => /^\/?resources/.test(value)), {
		true: sequence('putToResources', []),
		false: sequence('didntPutToResources', [
			get,
			/*			when(props`linking`), {
				true: [
				],
				false: [
					get,
				],
			},
			*/
		]),
	},
])

export const post = sequence('oada.post', [
	({props, state, oada}) => {
		return oada.post({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			token: state.get('oada.token'),
			contentType: props.contentType,
			data: props.data,
		}).then((response) => {
			return {
				// return the resource 
				_rev: response.headers['x-oada-rev'],
				id: response.headers.location.split('/').filter(n => n && true).slice(-1)[0],
			}
		})
	},
	// if POSTing to /resources, don't copy into state...
	when(props`path`, (value) => /^\/?resources/.test(value)), {
		true: sequence('postedToResources', []),
		false: sequence('didntPostToResources', [
			set(props`path`, props`path`+props`id`),
			get,
		]),
	},
])

function upsertTree({oada, props, state, path}) {

}

function fetch({oada, props, state, path}) {
	let recursiveGet = (url, token, obj) => {
		return Promise.map(Object.keys(obj) || {}, (key) => {
			if (obj[key] && typeof obj[key] === 'object') {
				if (key.charAt(0) === '_') return;
				// If the key is linked, follow it in oada
				if (obj[key]._id) {
					return oada.get({
						url: url+'/'+key,
						token
					}).then((res) => {
						obj[key] = res.data;
						return recursiveGet(url+'/'+key, token, obj[key])
					})
				// else traverse it as you would a normal object
				} else {
					return recursiveGet(url+'/'+key, token, obj[key])
				}
				return;
			}
			return;
		}).then(() => {
			return obj
		})
	}
	return oada.get({
		url: props.url,
		token: props.token
	}).then((response) => {
		return recursiveGet(props.url, props.token, response.data).then((result) => {
			return path.success({result})
		}).catch((error) => {
			return path.error({error})
		})
	}).catch((error) => {
		return path.error({error})
	})
}

export const oadaDelete = sequence('oada.delete', [
	({oada, state, props}) => {
		console.log(state.get('oada.token'))
		return oada.delete({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			token: state.get('oada.token'),
		})
	},
	when(props`path`, (value) => /^\/?resources/.test(value)), {
		true: sequence('deletedResource', []),
		false: sequence('didntDeleteResource', [
			({state, props}) => {
				let pieces = props.path.split('/').filter(n=>n&&true)
				return {
					path: pieces.slice(0,pieces.length-1).join('/'),
				}
			},
			fetchTree,
			/*			when(props`linking`), {
				true: [
				],
				false: [
					get,
				],
			},
			*/
		]),
	},
])

//
// linkToId		 : Whether to link to the given path (false) or the path 
//							 concatenated with the uuid returned by the POST (true).
//
// path				 : Where to link the created resource.
//
// data				 : The data to put in the created resource.
//
// contentType : The necessary Content-Type header oada uses to verify write
//							 permission.
export let createResourceAndLink = sequence('oada.createResourceAndLink', [
	({state, props}) => ({
		putPath: props.path,
		path: '/resources',
	}),
	post,
	({state, props}) => ({
		// Link to given path or path plus the random ID created by the POST
		path: (props.linkToId) ? props.putPath+'/'+props.id : props.putPath,
		data: {
			_id: 'resources/'+props.id,
			_rev: props._rev,
		},
		//		linking: true
	}),
	put,
])
