export default let makeResourceAndLink = ({token, url, data}) => {
	let urlObj = urlLib.parse(url);
	let domain = urlObj.protocol+'//'+urlObj.host;
	let req = {
		url: data._id ? domain+'/'+data._id : domain+'/resources',
		contentType: data._type,
		data,
		token,
	}
	let resource = data._id ? put(req) : post(req);
	return resource.then((response) => {
		console.log(response)
		data._id = response.headers['content-location'].replace(/^\//, '');
		console.log(data._id)
		let link = {
			url,
			'Content-Type': data._type,
			data: {_id:data._id},
			token,
		}
		if (data._rev) link.data._rev = '0-0'
		console.log(link)
		console.log('~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~')
		return put(link).then((res) => {
			return res
		})
	})
}
