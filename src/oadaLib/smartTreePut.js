export default let smartPut = (url, setupTree, returnData) => {
	console.log(url, setupTree, returnData)
	return Promise.try(() => {
		// Perform a GET if we have reached the next resource break.
		if (setupTree._type) { // its a resource
			console.log(url, 'is a resource. awaiting')
			return oada.get({
				url,
				token: props.token 
			}).then((response) => {
				console.log(url, 'finished getting', response.data)
				returnData = response.data;
				return
			})
		}
		return
	}).then(() => {
		// Walk down the data at this url and continue recursion.
		console.log(url, 'proceeding')
		return Promise.map(Object.keys(setupTree), (key) => {
			console.log(url, 'KEY', key)
			// If setupTree contains a *, this means we should get ALL content on the server
			// at this level and continue recursion for each returned key.
			if (key === '*') {
				console.log(url, 'found star')
				return Promise.map(Object.keys(returnData), (resKey) => {
					if (resKey.charAt(0) === '_') return
					return smartPut(url+'/'+resKey, setupTree[key] || {}, returnData[key]).then((res) => {
						return returnData[resKey] = res;
					})
				})
			} else if (typeof setupTree[key] === 'object') {
				console.log('in here', key, props.token)
				return smartPut(url+'/'+key, setupTree[key] || {}, returnData[key]).then((res) => {
					return returnData[key] = res;
				})
			} else return returnData[key]
		}).then(() => {
			return returnData
		})
	}).catch((err) => {
		console.log(err)
		console.log(err.response)
		// Put the data on the server and try to GET it over again. The 
		// replaceLinks function will create all of the data down to the next 
		// resource and we don't want to recursively and redundantly PUT key by 
		// key all the way down. We just want to skip from one resource down to 
		// the next.
		if (err.response.status === 404) {
			console.log(setupTree)
			return replaceLinks(setupTree).then((data) => {
				console.log('PUTTING', url, setupTree._type, data)
				return makeResourceAndLink({
					oada,
					token: props.token,
					url,
					data
				})
			}).then(() => {
				return smartPut(url, setupTree, returnData)
			})
		}
		throw err
	})
}
