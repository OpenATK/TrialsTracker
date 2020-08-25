import _ from 'lodash';
import geojsonArea from '@mapbox/geojson-area';

export default {
  open: false,
  fieldId: (local, state) => {
    return _.get(state, `view.Map.selectedField`);
  },
  field: ({fieldId: selectedFieldId}, state) => {
    const operation = _.get(state, `view.TopBar.OperationDropdown.selectedOperation`);
    if (selectedFieldId === null) return null;
    const status = _.get(operation, `fields.${selectedFieldId}.status`, null);
    let field = null;
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      field = _.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.fields.${selectedFieldId}`); //TODO year
    } else {
      field = _.get(state, `app.localData.abc123.seasons.2020.fields.${selectedFieldId}`); //TODO year, organization
    }
    if (field === null) return null;
    const acres = geojsonArea.geometry(field.boundary) * 0.000247105 //Meters to acres;
    return _.merge({}, field, {status, acres});
  },
  farm: ({field}, state) => {
    //Get farm for selected field
    let farm = null;
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      if (_.get(field, 'farm._id')) {
        const farmId = _.get(state, `oada.easonFarmsIdBy_id.${_.get(field, 'farm._id')}.id`)
        farm = _.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.farms.${farmId}`); //TODO year
      }
    } else {
      if (_.get(field, 'farm.id')) {
        farm = _.get(state, `app.localData.abc123.seasons.2020.farms.${field.farm.id}`); //TODO year, organization
      }
    }
    return farm;
  },
  showAddOperationButton: (local, state) => {
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      return _.isEmpty(_.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.operations`)); //TODO year
    } else {
      return _.isEmpty(_.get(state, `app.localData.abc123.seasons.2020.operations`)); //TODO year
    }
  }
}
