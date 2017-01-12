import PouchDB from 'pouchdb';

function getFromPouch(app_state_location) {
  function action({state, output}) {
  //First, check if the domain is already in the cache;
    var db = new PouchDB('TrialsTracker');
    db.get(app_state_location).then(function(result) {
      output.success({result});
    }).catch(function(err) {
      if (err.status !== 404) throw err;
      output.error({}); 
    })
  }
  action.async = true;
  action.outputs = ['success', 'error'],
  // You can set custom display names for the debugger
  action.displayName = 'getFromPouch'

  return action
}

export default getFromPouch
