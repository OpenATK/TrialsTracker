import Promise from 'bluebird';
import axios from 'axios';
import _ from 'lodash';
import pointer from 'json-pointer'
import URL from 'url'

function doStuff(req, websocket) {
	let domain = URL.parse(req.url).protocol + URL.parse(req.url).host
	let request = (websocket === null || websocket.url() !== domain) ? axios : websocket.http;
  return request(req)
}


function recursiveGet (domain, token, pathString, data, headers, websocket) {
 	let returnData = {};
	return doStuff({
		method: 'GET',
		url: 'https://'+domain+'/bookmarks'+pathString,
		headers: { Authorization: token }
	}, websocket).then((result) => {
		returnData = result.data;
  	return Promise.map(Object.keys(data), (key) => {
      if (key.charAt(0) === '_') return false;
// If data contains a *, this means we should get ALL content on the server
// at this level and continue recursion for each returned key.
  		if (key === '*') {
  			return Promise.map(Object.keys(result.data), (resKey) => {
  				return recursiveGet(domain, token, pathString+'/'+resKey, data[key], headers, websocket).then((res) => {
            return returnData[resKey] = res;
  				})
  			})
  		} else if (result.data[key]) {
	  		return recursiveGet(domain, token, pathString+'/'+key, data[key], headers, websocket).then((res) => {
          return returnData[key] = res;
			  })
			}
		})
	}).then(() => {
		return returnData
	})
}

function treePut(domain, token, pathString, data, setupTree, headers, websocket) {
// Walk up the data tree using json pointer. If a particular key occurs where a
// star exists, then check against `data` to determine whether a resource has 
// been created. 
	let puts = [];
	let tokens = pointer.parse(pathString)
	let setupTokens = tokens; 
	return Promise.each(tokens, (token, i) => {
		if (pointer.has(setupTree, pointer.compile(setupTokens.slice(0, i)+'/*'))) {
			setupTokens[i+1] = '*';
		}
		if (pointer.has(setupTree, pointer.compile(setupTokens.slice(0, i)+'/_type'))) {
  		if (!pointer.has(data, pointer.compile(tokens.slice(0, i)+'/_id'))) {
// Checking against the setupTree requires that we replace the token with a * 
// if a * placeholder exists in the setupTree.
				let contentType = pointer.get(setupTree, pointer.compile(setupTokens.slice(0, i)+'/_type'));
				let path = pointer.compile(tokens.slice(0, i));
				return createResource(domain, token, path, i>tokens.length-1 ? {} : data, {'Content-Type': contentType}, websocket).then((response) => {
          return puts.push({path, response})
				})
			}
		}
		return true;
	}).then(() => {
    return puts;
	})
}

function createResource(domain, token, path, data, headers, websocket) {
	/*
	  - Create a resource on an OADA cloud
	*/
// Remove the path if we are running in function mode, so paths in original 
// action work
  return doStuff(domain, token, '/resources', data, headers, websocket).then(({response}) => {
    var id = response.headers.location.split('/')
    id = id[id.length-1]
    return doStuff(domain, token, path, {_id:'resources/'+id, _rev: '0-0'}, headers, websocket)
  });
}

export default {
	createResource,
	treePut,
  recursiveGet,
}
