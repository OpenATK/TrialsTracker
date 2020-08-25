import _ from 'lodash';
import {v1 as uuid} from 'uuid'
import tree from "../../../app/OADAManager/tree";

function createFarm(context, {name}) {
  var farm = {
    name
  }
  return farm;
}
function addFarmToLocalData(context, {farm}) {
  const { state } = context;
  const id = uuid();
  _.set(state, `app.localData.abc123.farms.${id}`, farm); //TODO organization
  _.set(state, `app.localData.abc123.seasons.2020.farms.${id}`, farm); //TODO year, organization
  return id;
}
async function addFarmToOADA(context, {farm}) {
  const { state, actions } = context;
  const id = uuid();
  //TODO only add to season farms depending on what year is selected, need to figure out return values for that as well (since may only have one request)
  //Add to OADA
  let requests = [
    {
      tree,
      data: farm,
      path: `/bookmarks/fields/farms/${id}`
    },
    {
      tree,
      data: farm,
      path: `/bookmarks/seasons/2020/farms/${id}` //TODO year
    },
  ];
  let connection_id = _.get(state, `app.OADAManager.currentConnection`)
  const ret = await actions.oada.put({requests, connection_id})
  const farm_id = _.get(ret, 'responses.0.headers.content-location').substr(1); //Remove leading `/` from /resources/<uuid>
  if (farm_id == null) throw new Error('OADA did not return an _id when creating a farm.');
  const seasonFarm_id = _.get(ret, 'responses.1.headers.content-location').substr(1); //Remove leading `/` from /resources/<uuid>
  if (seasonFarm_id == null) throw new Error('OADA did not return an _id when creating a season farm.');
  return {farm_id, seasonFarm_id, id};
}
export default {
  open({state}, {callbackAction}) {
    const myState = state.view.Modals.NewFarm;
    myState.name = '';
    myState.open = true;
    myState.callbackAction = callbackAction || null;
  },
  close({state}) {
    const myState = state.view.Modals.NewFarm;
    myState.open = false;
  },
  async saveFarm(context) {
    const {state, actions} = context;
    const myState = state.view.Modals.NewFarm;
    const farm = createFarm(context, {name: myState.name})
    if (state.app.OADAManager.connected) {
      const {farm_id, seasonFarm_id, id} = await addFarmToOADA(context, {farm});
      if (myState.callbackAction) {
        const action = _.get(actions, myState.callbackAction);
        if (!action) throw new Error(`callbackAction: ${myState.callbackAction} does not exist.`)
        action({farm_id, seasonFarm_id, id});
      }
    } else {
      const id = await addFarmToLocalData(context, {farm});
      if (myState.callbackAction) {
        const action = _.get(actions, myState.callbackAction);
        if (!action) throw new Error(`callbackAction: ${myState.callbackAction} does not exist.`);
        action({id});
      }
    }
  },
  onNameChange({state}, {name}) {
    const myState = state.view.Modals.NewFarm;
    myState.name = name;
  },
  onCancel({actions}) {
    const myActions = actions.view.Modals.NewFarm;
    myActions.close();
  },
  async onSave({actions}) {
    const myActions = actions.view.Modals.NewFarm;
    await myActions.saveFarm();
    myActions.close();
  }
}
