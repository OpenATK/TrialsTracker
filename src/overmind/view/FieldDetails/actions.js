import _ from 'lodash';
import tree from '../../app/OADAManager/tree.js';

export default {
  open({state}) {
    const myState = state.view.FieldDetails;
    myState.open = true;
  },
  close({state}) {
    const myState = state.view.FieldDetails;
    myState.open = false;
  },
  changeOADAFieldStatus({state, actions}, status) {
    const selectedFieldId = _.get(state, `view.Map.selectedField`);
    const operationId = _.get(state, `view.TopBar.OperationDropdown.selectedOperationId`)

    let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
    let field = _.clone(_.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`)) || {}; //TODO year, organization
    let newStatus = status;
    if (field.status === status) newStatus = null; //Unchecking
    field.status = newStatus;
    if (field.status === null) {
      //Optimistic Update
      //Remove field from operation
      _.unset(state, `oada.${currentConnection}.bookmarks.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`) //TODO year, organization
      //Remove operation from season's field's operation list
      _.unset(state, `oada.${currentConnection}.bookmarks.seasons.2020.fields.${selectedFieldId}.operations.${operationId}`) //TODO year, organization

      //Change on server
      let requests = [
        {  //Remove field to operation
          type: 'application/vnd.oada.operation.1+json', //TODO oada.put should handle this
          path: `/bookmarks/seasons/2020/operations/${operationId}/fields/${selectedFieldId}` //TODO year
        },
        { //Remove operation to field in season's field's operation list
          type: 'application/vnd.oada.field.1+json',
          path: `/bookmarks/seasons/2020/fields/${selectedFieldId}/operations/${operationId}` //TODO year
        }
      ];
      actions.oada.delete({requests, connection_id: currentConnection});
    } else {
      //Optimistic Update
      //Add field to operation
      _.set(state, `oada.${currentConnection}.bookmarks.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`, field) //TODO year, organization
      //Create operations key on season's field list if doesn't exist
      if (_.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.fields.${selectedFieldId}.operations`) === null) _.set(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}.operations`, {}) //TODO year, organization
      //Add operation to field in season's field's operation list
      _.set(state, `oada.${currentConnection}.bookmarks.seasons.2020.fields.${selectedFieldId}.operations.${operationId}`, {}) //TODO year, organization

      //Change on server
      const operation = _.get(state, `view.TopBar.OperationDropdown.selectedOperation`)
      let requests = [
        {  //Add field to operation
          tree,
          data: field,
          type: 'application/vnd.oada.operation.1+json', //TODO oada.put should handle this
          path: `/bookmarks/seasons/2020/operations/${operationId}/fields/${selectedFieldId}` //TODO year
        },
        { //Add operation to field in season's field's operation list
          tree,
          data: {_id: operation._id}, //OADA _id
          type: 'application/vnd.oada.field.1+json',
          path: `/bookmarks/seasons/2020/fields/${selectedFieldId}/operations/${operationId}` //TODO year
        }
      ];
      actions.oada.put({requests, connection_id: currentConnection});
    }
  },
  changeLocalFieldStatus({state}, status) {
    const selectedFieldId = _.get(state, `view.Map.selectedField`);
    const operationId = _.get(state, `view.TopBar.OperationDropdown.selectedOperationId`)
    var field = _.clone(_.get(state, `app.localData.abc123.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`)) || {}; //TODO year, organization
    var newStatus = status;
    if (field.status === status) newStatus = null; //Unchecking
    field.status = newStatus;
    if (field.status === null) {
      //Remove field from operation
      _.unset(state, `app.localData.abc123.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`) //TODO year, organization
      //Remove operation from season's field's operation list
      _.unset(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}.operations.${operationId}`) //TODO year, organization
    } else {
      //Add field to operation
      _.set(state, `app.localData.abc123.seasons.2020.operations.${operationId}.fields.${selectedFieldId}`, field) //TODO year, organization
      //Create operations key on season's field list if doesn't exist
      if (_.get(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}.operations`) === null) _.set(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}.operations`, {}) //TODO year, organization
      //Add operation to field in season's field's operation list
      _.set(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}.operations.${operationId}`, {}) //TODO year, organization
    }
  },
  onStatusChange({state, actions}, {status}) {
    const myActions = actions.view.FieldDetails;
    if (state.app.OADAManager.connected) {
      myActions.changeOADAFieldStatus(status)
    } else {
      myActions.changeLocalFieldStatus(status)
    }
  },
  onAddNewOperationClick({actions}) {
    actions.view.TopBar.OperationDropdown.onAdd();
  }
}
