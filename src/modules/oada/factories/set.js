export var someSetAction = [
	set(state`notes.${props`noteId`}.text`, props`text`),
	//now set this in the cache
	pouchdb.put(`notes.${props`noteId`}.text`),
	axios({
		method: put,
		url: domain+(`notes.${props`noteId`}.text`).split('.').join('/'),
		headers: {
			Authorization: 'Bearer '+token,
      'Content-Type': type
		},
		data: props`text`
	})
]

export var someGetAction = [
  get(state`notes.${props`noteId`}.text`, props`text`),
	pouchdb.get(`notes.${props`noteId`}.text`), {
		success: [

		]
		error: [

		],
  
]


export var someSortOfBatchSync
		//loop over each of the things that've not been synced and sync them

