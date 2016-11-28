function storeToken({input, state}) {
  var db = new PouchDB('TrialsTracker');
  db.put({
    doc: {token: input.token},
    _id: 'token',
  }).catch(function(err) {
    if (err.status !== 409) throw err;
  });
  state.set(['app', 'view', 'server', 'token'], input.token);
  state.set('app.view.offline', false);
}

function storeToken({input, state, services}) {
  db.local.put(doc)
    .then(res => output.success(res))
    .catch(err => output.error(err))
}


