import _ from 'lodash';

export default {
  open: false,
  selected: null,
  search: '',
  list: ({selected, operations}, state) => {
    //Get operations, filtering by search
    const search = _.get(state, `view.TopBar.OperationDropdown.search`)
    return _.omitBy(_.mapValues(operations, ({name}, id) => {
      if (id === null) return null; //Not an operation, a _key for oada
      if (name === null) return null;
      if (search !== '' && name.search(search) === -1) return null;
      return {
        text: name,
        value: id,
        selected: (selected === id),
        label: { color: 'green', empty: true, circular: true }
      }
    }), _.isEmpty)
  },
  operations: (local, state) => {
    let operations = null;
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      operations = _.omitBy(_.get(state, `app.oada.${currentConnection}.bookmarks.seasons.2020.operations`) || {}, (o, k) => {return _.startsWith(k, '_')}); //TODO year
    } else {
      operations = _.get(state, `app.localData.abc123.seasons.2020.operations`) //TODO year, organization
    }
    return operations
  },
  selectedOperationId: ({selected, operations}, state) => {
    let selectedId = selected;
    if (selectedId === null && _.keys(operations).length > 0) selectedId = _.keys(operations)[0];
    return selectedId;
  },
  selectedOperation: ({selectedOperationId, operations}, state) => {
    return operations[selectedOperationId];
  }
}
