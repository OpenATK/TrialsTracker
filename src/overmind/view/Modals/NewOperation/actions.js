import _ from 'lodash';
import {v1 as uuid} from 'uuid'
import tree from "../../../app/OADAManager/tree";

function createOperation(context, {name}) {
  var operation = {
    name,
    fields: {}
  }
  return operation;
}

function addOperationToLocalData({state}, {operation}) {
  const id = uuid();
  _.set(state, `app.localData.abc123.seasons.2020.operations.${id}`, operation); //TODO year, organization
  return id;
}
async function addOperationToOADA({state, actions}, {operation}) {
  //Add to OADA
  const id = uuid();
  let requests = [
    {
      tree,
      data: operation,
      path: `/bookmarks/seasons/2020/operations/${id}` //TODO year
    }
  ];
  const connection_id = _.get(state, `app.OADAManager.currentConnection`)
  const ret = await actions.app.oada.put({requests, connection_id})
  const _id = _.get(ret, 'responses.0.headers.content-location').substr(1); //Remove leading `/` from /resources/<uuid>
  return {id, _id}
}

export default {
  open({state}) {
    const myState = state.view.Modals.NewOperation;
    myState.name = '';
    myState.open = true;
  },
  close({state}) {
    const myState = state.view.Modals.NewOperation;
    myState.open = false;
  },
  async saveOperation(context) {
    const {state} = context;
    const myState = state.view.Modals.NewOperation;
    const operation = createOperation(context, {name: myState.name})
    if (state.app.OADAManager.connected) {
      const {id} = await addOperationToOADA(context, {operation});
      _.set(state, `view.TopBar.OperationDropdown.selected`, id)
    } else {
      const id = await addOperationToLocalData(context, {operation});
      _.set(state, `view.TopBar.OperationDropdown.selected`, id)
    }
  },
  onNameChange({state}, {name}) {
    const myState = state.view.Modals.NewOperation;
    myState.name = name;
  },
  onCancel({actions}) {
    const myActions = actions.view.Modals.NewOperation;
    myActions.close();
  },
  async onSave({actions}) {
    const myActions = actions.view.Modals.NewOperation;
    await myActions.saveOperation();
    myActions.close();
  }
}
