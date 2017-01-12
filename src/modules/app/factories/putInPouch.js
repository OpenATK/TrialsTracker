import PouchDB from 'pouchdb';
import uuid from 'uuid';

function putInPouch(app_state_location) {
  function action({state}) {
    var val = state.get(app_state_location);
    if (val) {
      var db = new PouchDB('TrialsTracker');
      db.put({
        doc: {val},
        _id: app_state_location,
      }).catch(function(err) {
        if (err.status !== 409) throw err;
      })
    }
  }

  // You can set custom display names for the debugger
  action.displayName = 'putInPouch'

  return action
}

export default putInPouch
