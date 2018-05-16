export default function getFromPouch(_id) {
  function action({path, oada}) {
		//First, check if the domain is already in the cache;
    return oada.cache.db.get(_id)
    .then((result) => {return path.success({result})})
    .catch((err)=> { return path.error({err})})
  }
  // You can set custom display names for the debugger
  action.displayName = 'getFromPouch'

  return action;
}
