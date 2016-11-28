function getOadaDomain({state, output}) {
  //First, check if the domain is already in the cache;
  var db = new PouchDB('TrialsTracker');
  db.get('domain').then(function(result) {
    if (result.doc.domain.indexOf('offline') > 0) {
      output.offline({}); //In cache, but not connected to server for now
    } else {
      output.cached({value: result.doc.domain});//In cache, use it. 
    }
  }).catch(function(err) {
    if (err.status !== 404) throw err;
    console.log('fail');
    output.fail({});//Don't have it yet, prompt for it. 
  })
};
getOadaDomain.outputs = ['cached', 'offline', 'fail'];
getOadaDomain.async = true;


