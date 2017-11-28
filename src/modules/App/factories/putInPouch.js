import db from '../../Pouch';

function putInPouch(app_state_location) {
  function action({state}) {
    var val = state.get(app_state_location);
    if (val) {
      return db().put({
        doc: {val},
        _id: app_state_location,
      }).then(() => {
        return null;
      }).catch(function(err) {
        if (err.status !== 409) throw err;
        return null;
      })
    } else return null
  }

  // You can set custom display names for the debugger
  action.displayName = 'putInPouch'

  return action
}

export default putInPouch
