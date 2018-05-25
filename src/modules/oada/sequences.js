import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';

//TODO: make the function that recursively gets a tree and creates it if it doesn't exist
// Make lookup tree for resources -> path so it can quickly be found in cerebral


// What assumptions should we make regarding PUTs to resources? Can users PUT to
// deep parts of a resource??? (They'll need to if putting data points to 
// as-harvested.

export const authorize = sequence('oada.authorize', [
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

export const init = sequence('oada.init', [
	authorize,
])

export const fetchTree = sequence('oada.fetchTree', [
	({props, state}) => ({
		token: state.get('oada.token'),
		url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
	}),
	fetch,
	when(props`omit`), {
		false: [({state, props}) => state.set('oada.'+props.path.split('/').filter(n=>n&&true).join('.'), props.result)],
		true: []
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
	when(props`omit`), {
		false: [set(state`oada.${props`cerebralPath`}`, props`data`)],
		true: []
	}
])

export const updateState = sequence('oada.updateState', [
	when(props`path`, (value) => /^\/?resources/.test(value)), {
		true: sequence('postedToResources', [
			when(props`putPath`), {
				true: [
					//A reverse index should be added for POSTs/PUTs to /resources
					set(state`oada.resources.${props`id`}`, props`putPath`),
				],
				false: [],
			},
		]),
		// Set path for a GET to propagate PUT data into state tree
		false: sequence('didntPostToResources', [
			get,
		]),
	},
])

export const put = sequence('oada.put', [
	({oada, state, props}) => {
		return oada.put({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			contentType: props.contentType,
			data: props.data,
			token: state.get('oada.token'),
		}).then((response) => {
			return {
				// return the resource 
				_rev: response._rev,
				id: response.location.split('/').filter(n => n && true).slice(-1)[0],
			}
		})
	},
	updateState,
])

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
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
				_rev: response._rev,
				id: response.location.split('/').filter(n => n && true).slice(-1)[0],
			}
		})
	},
	updateState
])

function fetch({oada, props, state, path}) {
	let recursiveGet = (url, setupTree) => {
		let returnData = {};
		return oada.get({
			url,
			token: props.token 
		}).then((response) => {
			returnData = response.data;
			return Promise.map(Object.keys(setupTree || returnData), (key) => {
				//if (key === '_type') return 
				// If setupTree contains a *, this means we should get ALL content on the server
				// at this level and continue recursion for each returned key.
				if (key === '*') {
					return Promise.map(Object.keys(returnData), (resKey) => {
						if (resKey.charAt(0) === '_') return
						return recursiveGet(url+'/'+resKey, setupTree[key] || {}).then((res) => {
							return returnData[resKey] = res;
						})
					})
				} else {
					return recursiveGet(url+'/'+key, setupTree[key] || {}).then((res) => {
						return returnData[key] = res;
					})
				}
			})
		}).then(() => {
			return returnData
		})
	}
	return recursiveGet(props.url, props.setupTree).then((result) => {
		return {result}
	})
}

export const oadaDelete = sequence('oada.delete', [
	({oada, state, props}) => {
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
// uuid        : When given, create the resource via PUT using this uuid.
export const createResourceAndLink = sequence('oada.createResourceAndLink', [
	// create resource
	({state, props}) => ({
		putPath: props.path,
		path: props.uuid ? '/resources/'+ props.uuid : '/resources',
	}),
	when(props`uuid`), {
		true: [put],
		false: [post]
	},
	// Link the new resource
	({state, props}) => {
		let content = {
			_id: 'resources/'+props.id, 
			_rev: props._rev
		}
		// Link to given path or path plus the random ID created by the POST
		// Its important to perform the PUT in this manner so that the parent 
		// resource gets updated.
		let data = (props.linkToId) ? {[props.id]: content} : content;
		return {
			path: props.putPath,
			data,
		}
	},
	put,
])

export const registerWatch = sequence('oada.registerWatch', [
	({state, props, oada}) => {
		return oada.watch({
			token: state.get('oada.token'),
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			
		}).then((result) => {

		})
	},
	set(state`oada.watches`, {}),
])

export const configureWs = sequence('oada.configureWs', [
	({state, props, oada}) => {
		return oada.configureWs({
			url: state.get('oada.domain')
		}).then((socketApi) => {
			return {socketApi}
		})
	},
	set(state`oada.websocket`, props`socketApi`),
	set(state`oada.domain`, props`socketApi.url`)
])

export const configureCache = sequence('oada.configureCache', [
	({props, oada}) => {
		return oada.configureCache({
			name: 'TrialsTracker'
		})
	},
])

export const clearCache = sequence('oada.clearCache', [
	({oada}) => {
		return oada.clearCache()
	}
])
