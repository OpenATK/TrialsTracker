process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
var axios = require('axios');
var Promise = require('bluebird');

function* gen() {
	for (var i = 0; i < 100001; i++) {
		yield i
	}
}
Promise.map(gen(), (i) => {
	console.log(i)
	return axios({
		method: 'put',
		url: 'https://vip3.ecn.purdue.edu/bookmarks/test',
		data: '123',
		headers: { Authorization: 'Bearer def',
			'Content-Type': 'application/vnd.oada.yield.1+json'
		}
	})
}, {concurrency: 25})
