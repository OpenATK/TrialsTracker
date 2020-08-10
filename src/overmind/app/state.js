import testFields from './test/testFields';
import testFarms from './test/testFarms';
import _ from 'lodash';
import geojsonArea from '@mapbox/geojson-area';

export default {
  acresStatus: (local, state) => {
    //Get id's of all fields in this operation
    const operationFields = state.app.operationFields;
    const seasonFields = state.app.seasonFields;
    //Loop through each field, totaling acres.
    let planned = 0;
    let started = 0;
    let done = 0;
    _.forEach(operationFields, (fieldOperation, key) => {
      if (fieldOperation === null) return;
      //Get field
      let field = seasonFields[key];
      if (field === null) return;
      //Compute area of field boundary
      let area = geojsonArea.geometry(field.boundary) * 0.000247105 //Meters to acres;
      if (fieldOperation.status === 'planned') {
        planned += area;
      } else if (fieldOperation.status === 'started') {
        started += area;
      } else if (fieldOperation.status === 'done') {
        done += area;
      }
    });
    let total = planned + started + done;
    return {
      planned: Math.round(planned),
      plannedPercentage: Math.round((planned / (total || 1)) * 100),
      started: Math.round(started),
      startedPercentage: Math.round((started / (total || 1)) * 100),
      done: Math.round(done),
      donePercentage: Math.round((done / (total || 1)) * 100),
    };
  },
  seasonFarms: (local, state) => {
    let farms;
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      farms = _.chain(state).get(`app.oada.${currentConnection}.bookmarks.seasons.2020.farms`).omitBy((v, k) => { //TODO year
        if (_.startsWith(k, '_')) return true;
        if (v === null) return true;
      }).value();
    } else {
      farms = _.get(state, `app.localData.abc123.seasons.2020.farms`) //TODO year, organization
    }
    return farms || {};
  },
  seasonFields: (local, state) => {
    let fields;
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      fields = _.chain(state).get(`app.oada.${currentConnection}.bookmarks.seasons.2020.fields`).omitBy((v, k) => { //TODO year
        if (_.startsWith(k, '_')) return true;
        if (v === null) return true;
      }).value();
    } else {
      fields = _.get(state, `app.localData.abc123.seasons.2020.fields`) //TODO year, organization
    }
    return fields || {};
  },
  operationFields: (local, state) => {
    let operationId = _.get(state, 'view.TopBar.OperationDropdown.selectedOperationId');
    let operationFields = [];
    if (operationId != null) {
      if (_.get(state, `app.OADAManager.connected`) === true) {
        let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
        operationFields = _.get(state, `app.oada.${currentConnection}.bookmarks.seasons.2020.operations.${operationId}.fields`) || []; //TODO year
      } else {
        operationFields = _.get(state, `app.localData.abc123.seasons.2020.operations.${operationId}.fields`) || []; //TODO year, organization
      }
    }
    return operationFields; // {<field-id>: {status: 'planned'}, ...}
  },
  currentOADA: (local, state) => {
    if (state.app.OADAManager.connected) {
      const currentConnection = state.app.OADAManager.currentConnection;
      if (!currentConnection) return;
      return state.app.oada[currentConnection];
    }
  },
  oadaOrgData: ({currentOADA}) => {
    if (currentOADA) {
      return currentOADA.bookmarks;
    }
  },
  oadaSeasonFarmsIdBy_id: ({oadaOrgData}, state) => {
    return _.chain(oadaOrgData).get(`seasons.2020.farms`).mapValues((v, k) => {
      if (!v) return null
      return {_id: v._id, id: k};
    }).omitBy(_.isNull).mapKeys((v, k) => {
      return v._id; //Key of oada id
    }).value();  //{_id: <oada-res-id>, id: <path-id>}
  },
  oadaSeasonFarms_idByFarm_id: ({oadaOrgData}, state) => {
    return _.chain(oadaOrgData).get(`fields.farms`).mapValues((v, k) => {
      if (!v) return null
      //Lookup season farm id
      const seasonFarm_id = _.get(oadaOrgData, `seasons.2020.farms.${k}._id`);
      return {seasonFarm_id: seasonFarm_id, farm_id: v._id};
    }).omitBy(_.isNull).mapKeys((v, k) => {
      return v.farm_id; //Key of oada id
    }).value();  //{_id: <oada-res-id>, id: <path-id>}
  },
  localOrgData: ({localData}) => {
    return localData.abc123; //TODO organization
  },
  localData: {
    organizations: {
      'abc123': {
        name: 'Default'
      }
    },
    'abc123': {
      fields: {
        fields: {
          /*'a': {
            id: 'a',
            name: 'Back 40',
            boundary: '' //GEOJSON
          }*/
          ...testFields,
        },
        farms: {
          ...testFarms,
        }
      },
      seasons: {
        /*'2020': {
          fields: {
            '<field-uuid>': {
              season: 2018,
              boundary: <geo-json>,
              operations: {
                '<operation-uuid>': {}
              }
            }
          },
          operations: {
            '<operation-uuid>': {
              id: '<operation-uuid>',
              year: 2020,
              name: 'Corn Planting',
              fields: {
                '<field-uuid>': {
                  status: 'Planned',
                }
              }
            }
          }
        }*/
        '2020': {
          fields: {
            ...testFields,
          },
          farms: {
            ...testFarms,
          },
          operations: {
            /*'<operation-uuid>': {
              id: '<operation-uuid>',
              year: 2020,
              name: 'Corn Planting',
              fields: {
                '<field-uuid>': {
                  status: 'Planned',
                }
              }
            }*/
          }
        }
      }
    }
  }
}
