import db from '../../Pouch';

export default function getFromPouch(app_state_location) {
  function action({path}) {
  //First, check if the domain is already in the cache;
    return db().get(app_state_location)
    .then(path.success())
    .catch((err)=> {
      return path.error()
    })
  }
  // You can set custom display names for the debugger
  action.displayName = 'getFromPouch'

  return action;
}
