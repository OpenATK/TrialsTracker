function putInPouch(_id) {
  function action({state, oada}) {
    var val = state.get(_id);
		if (val) {
			let doc = {
				val,
				_id
			}
      return oada.cache.db.put(doc).then(() => {
        return null;
      }).catch(function(err) {
				if (err.status !== 409) throw err;
				return oada.cache.db.upsert(_id, () => {
          doc.counter = doc.counter || 0;
	        doc.counter++;
        	return doc;
				}).then((res) => {
					console.log(res)
					return null
				}).catch((err) => {
					console.log('something else bad happened', err)
        return null;
				})
      })
    } else return null
  }

  // You can set custom display names for the debugger
  action.displayName = 'putInPouch'

  return action
}

export default putInPouch
