import _ from 'lodash';
import {v1 as uuid} from 'uuid'
import tree from "../../../app/OADAManager/tree";


function convertToGEOJSON(points) {
  var boundary = {
    type: "Polygon",
    coordinates: [_.map(points, (p) => {return [p[1], p[0]]})] //Flip lat/lng and add array around
  }
  //Add first point again
  if (boundary.coordinates && boundary.coordinates[0] && boundary.coordinates[0].length > 0) {
    boundary.coordinates[0].push(boundary.coordinates[0][0]);
  }
  return boundary;
}
function getChanges({state, actions}, {fieldId, newBoundary, farmId, farm_id, seasonFarm_id}) {
  const myState = state.view.Modals.SaveField;
  //See if name or boundary has changed
  let seasonField = actions.app.getSeasonField(fieldId);
  let newName = myState.name;
  var seasonFieldChanges = {};
  var fieldChanges = {};
  //Get changes the effect both
  if (newName !== seasonField.name) seasonFieldChanges.name = newName;
  if (_.isEqual(newBoundary, seasonField.boundary) === false) seasonFieldChanges.boundary = newBoundary;

  fieldChanges = _.cloneDeep(seasonFieldChanges)
  //See if farm has changed
  if (seasonFarm_id) {
    //Connected to oada
    if (!seasonField.farm || seasonField.farm._id !== seasonFarm_id) {
      seasonFieldChanges.farm = {_id: seasonFarm_id};
      //TODO this isn't right, we shouldn't be adding a farm in the function that calls this if it isn't our current year
      fieldChanges.farm = {_id: farm_id};
    }
  } else {
    //Local
    if (!seasonField.farm || seasonField.farm.id !== farmId) {
      seasonFieldChanges.farm = {id: farmId};
      fieldChanges.farm = {id: farmId};
    }
  }
  //TODO only change field if is current year
  return {fieldChanges, seasonFieldChanges};
}
function saveChangesToLocalData({state}, editingFieldId, fieldChanges, seasonFieldChanges) {
  if (_.isEmpty(fieldChanges) && _.isEmpty(seasonFieldChanges)) return;
  const fieldPath = `app.localData.abc123.fields.fields.${editingFieldId}`; //TODO organization
  _.set(state, fieldPath, _.merge({}, _.get(state, fieldPath), fieldChanges));
  const seasonFieldPath = `app.localData.abc123.seasons.2020.fields.${editingFieldId}` //TODO year, organization
  _.set(state, seasonFieldPath, _.merge({}, _.get(state, seasonFieldPath), seasonFieldChanges));
}
async function saveChangesToOADA(context, editingFieldId, fieldChanges, seasonFieldChanges) {
  const { state, actions } = context;
  if (_.isEmpty(fieldChanges) && _.isEmpty(seasonFieldChanges)) return;
  //Add to OADA
  let requests = [];
  if (_.isEmpty(fieldChanges) === false) {
    requests.push({
      tree,
      data: fieldChanges,
      path: `/bookmarks/fields/fields/${editingFieldId}`
    })
  }
  if (_.isEmpty(seasonFieldChanges) === false) {
    requests.push({
      tree,
      data: seasonFieldChanges,
      path: `/bookmarks/seasons/2020/fields/${editingFieldId}` //TODO year
    })
  }
  console.log('fieldChanges', fieldChanges);
  console.log('seasonFieldChanges', seasonFieldChanges);
  const connection_id = _.get(state, `app.OADAManager.currentConnection`)
  await actions.app.oada.put({requests, connection_id})
}

function createField(context, {boundary, farmId, farm_id}) {
  const { state } = context;
  const myState = state.view.Modals.SaveField;
  var field = {
    name: myState.name,
    boundary: boundary,
    farm: (farm_id) ?
      {
        _id: farm_id //OADA farm resource id
      }
      :
      {
        id: farmId
      }
  }
  return field
}
function addFieldToLocalData(context, {field}) {
  const { state } = context;
  const id = uuid();
  _.set(state, `app.localData.abc123.fields.fields.${id}`, field); //TODO organization
  _.set(state, `app.localData.abc123.seasons.2020.fields.${id}`, {...field, operations: {}, year: '2020'}); //TODO year, organization
  return id;
}
async function addFieldToOADA(context, {field, seasonField}) {
  const { state, actions } = context;
  const id = uuid();
  //Add to OADA
  let requests = [];
  if (field) {
    requests.push({
      tree,
      data: field,
      path: `/bookmarks/fields/fields/${id}`
    })
  }
  if (seasonField) {
    requests.push({
      tree,
      data: {...seasonField, operations: {}, year: '2020'}, //TODO year
      path: `/bookmarks/seasons/2020/fields/${id}` //TODO year
    })
  }
  let connection_id = _.get(state, `app.OADAManager.currentConnection`)
  await actions.app.oada.put({requests, connection_id})
}

export default {
  open({state, actions}) {
    const myState = state.view.Modals.SaveField;
    const editingField = _.get(state, `view.Map.editingField`);
    if (editingField === null) {
      myState.name = "";
    } else {
      let field = actions.app.getSeasonField(editingField);
      //Populate the name in the modal popup
      myState.name = field.name;
      if (state.app.OADAManager.connected) {
        //Get season farm id by oada id
        const farmId = _.get(state, `app.oadaSeasonFarmsIdBy_id.${_.get(field, 'farm._id')}.id`)
        myState.farmId = farmId;
      } else {
        myState.farmId = _.get(field, 'farm.id');
      }
    }
    myState.open = true;
  },
  close({state}) {
    const myState = state.view.Modals.SaveField;
    myState.open = false;
  },
  async saveField(context) {
    const {state} = context;
    const myState = state.view.Modals.SaveField;
    //Convert the field to geojson
    const points = _.get(state, `view.Map.BoundaryDrawing.boundary`)
    const boundary = convertToGEOJSON(points);

    //Create farm or get existing farms id (cannot update an existing farm here)
    let farmId = myState.farmId;
    let farm_id = null;
    let seasonFarm_id = null;
    let farm = myState.farm;
    if (farm) {
      if (state.app.OADAManager.connected) {
        //Get farm_id
        farm_id = _.get(state, `app.oadaOrgData.fields.farms.${farmId}._id`)
        //Get seasonFarm_id from farmId
        seasonFarm_id = _.get(state, `app.seasonFarms.${farmId}._id`)
      }
    }
    //Update or create field
    let editingFieldId = _.get(state, `view.Map.editingField`);
    if (editingFieldId) {
      //We are editing a field find the changes, if any
      const {fieldChanges, seasonFieldChanges} = getChanges(context, {fieldId: editingFieldId, newBoundary: boundary, farmId, farm_id, seasonFarm_id})
      if (state.app.OADAManager.connected) {
        saveChangesToOADA(context, editingFieldId, fieldChanges, seasonFieldChanges)
      } else {
        saveChangesToLocalData(context, editingFieldId, fieldChanges, seasonFieldChanges)
      }
    } else {
      //TODO only add field if is current year, otherwise just seasonfield
      if (state.app.OADAManager.connected) {
        const field = await createField(context, {boundary, farm_id});
        const seasonField = await createField(context, {boundary, farm_id: seasonFarm_id});
        await addFieldToOADA(context, {field, seasonField})
      } else {
        const field = await createField(context, {boundary, farm, farmId: farmId})
        await addFieldToLocalData(context, {field})
      }
    }
  },
  onSave({actions, state}) {
    const myActions = actions.view.Modals.SaveField;
    myActions.saveField();
    actions.view.Map.BoundaryDrawing.onStopDrawing();
    state.view.Map.editingField = null;
    myActions.close();
  },
  onCancel({actions, state}) {
    const myActions = actions.view.Modals.SaveField;
    actions.view.Map.BoundaryDrawing.onStopDrawing();
    state.view.Map.editingField = null;
    myActions.close();
  },
  onNameChange({state}, {name}) {
    const myState = state.view.Modals.SaveField;
    myState.name = name;
  },
  onFarmSearchChange({state}, value) {
    const myState = state.view.Modals.SaveField;
    myState.farmSearch = value;
  },
  onFarmChange({state}, {id}) {
    const myState = state.view.Modals.SaveField;
    myState.farmId = id;
  },
  onFarmAdd({actions}) {
    actions.view.Modals.NewFarm.open({callbackAction: 'view.Modals.SaveField.onFarmAddComplete'});
  },
  onFarmAddComplete({state}, {id}) {
    const myState = state.view.Modals.SaveField;
    //Update farmId
    myState.farmId = id;
  }
}
