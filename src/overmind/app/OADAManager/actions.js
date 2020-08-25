import tree from './tree';
import config from '../../../config'
import Promise from 'bluebird'
import _ from 'lodash'
import { browser as oadaIdClient } from '@oada/oada-id-client/index.js'
const getAccessToken = Promise.promisify(oadaIdClient.getAccessToken)

export default {
  async getToken({state}, domain) {
    /*
      Get token from local storage or request one
    */
    const myState = state.app.OADAManager;
    if (myState.token && myState.token !== 'undefined') return myState.token;
    let res = await getAccessToken(domain.replace(/^https?:\/\//, ''), {
      metadata: config.METADATA,
      scope: config.SCOPE,
      redirect: config.REDIRECT
    })
    return res.access_token;
  },
  async connect({actions, state, effects}, {domain, token}) {
    const myState = state.app.OADAManager;
    const myActions = actions.app.OADAManager;
    if (token) myState.token = token;
    token = await myActions.getToken(domain);
    return actions.oada.connect({
      token,
      domain: domain,
      options: config.OPTIONS,
      cache: false,
      concurrency: 1,
    }).then((response) => {
      if (!response.error) {
        myState.currentConnection = response.connectionId;
        myState.token = response.token;
        myState.connected = true;
        //Unselect local opeation
        state.view.TopBar.OperationDropdown.selected = null;
      }
      return response;
    })
  },
  async logout({actions, state}) {
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    delete myState.token;
    await actions.oada.disconnect({connection_id})
  },
  async getUserInfo({actions, state}) {
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    let requests = [{
      path: '/users/me',
    }];
    await actions.oada.get({requests, connection_id})
  },
  async fetchAndWatch({actions, state}) {
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    //Fetch field and seasons
    let watchRequests = [
      {
        path: '/bookmarks/fields',
        tree,
        watch: {
          actions: [actions.app.OADAManager.onFieldChanged]
        }
      },
      {
        path: '/bookmarks/seasons',
        tree,
        watch: {
          actions: []
        },
      }
    ];
    const ret = await actions.oada.get({requests: watchRequests, connection_id})
    let rewatchRequests = [];
    if (ret.responses[0].error) {
      //On 404 create and rewatch
      if (ret.responses[0].status !== 404) throw ret.responses[0].error;
      //Create fields and try to watch again
      let requests = [{
        tree,
        data: {
          fields: {},
          farms: {}
        },
        path: '/bookmarks/fields'
      }];
      //Create
      await actions.oada.put({requests, connection_id})
      //Rewatch
      rewatchRequests.push(watchRequests[0]);
    }
    if (ret.responses[1].error) {
      //On 404 create and rewatch
      if (ret.responses[1].status !== 404) throw ret.responses[0].error;
      //Create seasons and try to watch again
      let requests = [{
        tree,
        data: {},
        path: '/bookmarks/seasons'
      }];
      //Create
      await actions.oada.put({requests, connection_id})
      //Rewatch
      rewatchRequests.push(watchRequests[1]);
    }
    if (rewatchRequests.length > 0) await actions.oada.get({requests: rewatchRequests, connection_id})
  },
  initSeasonFields({state, actions}) {
    /*
      Put changes from master field list into season fields
    */
    const myActions = actions.app.OADAManager;
    //Get master field list fields
    var fieldsChanged = [];
    _.forEach(_.get(state, 'oada.rgData.fields.fields'), (obj, key) => {
      if (_.startsWith(key, '_')) return;
      fieldsChanged.push({fieldId: key, name: obj.name, boundary: obj.boundary, farm: obj.farm});
    })
    return myActions.changeSeasonFields(fieldsChanged);
  },
  initSeasonFarms({state, actions}) {
    /*
      Put changes from master farm list into season farms
    */
    const myActions = actions.app.OADAManager;
    //Get master field list fields
    var changed = [];
    _.forEach(_.get(state, 'oada.rgData.fields.farms'), (obj, key) => {
      if (_.startsWith(key, '_')) return;
      changed.push({farmId: key, name: obj.name});
    })
    return myActions.changeSeasonFarms(changed);
  },
  async changeSeasonFields({state, actions}, fieldsChanged) {
    /*
      Apply any changes to season fields
    */
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    //See if they match season fields.
    let requests = [];
    let theSeasonFields = state.app.seasonFields;
    _.forEach(fieldsChanged, (fieldChange) => {
      if (fieldChange.fieldId === null) return;
      let data = {};
      let seasonField = theSeasonFields[fieldChange.fieldId]
      if (fieldChange.name) {
        if (seasonField === null || seasonField.name !== fieldChange.name) {
          data.name = fieldChange.name;
        }
      }
      if (fieldChange.boundary) {
        if (seasonField === null || _.isEqual(seasonField.boundary, fieldChange.boundary) === false) {
          data.boundary = fieldChange.boundary;
        }
      }
      if (fieldChange.farm) {
        //Find new season farm id from farm id
        const farmId = _.get(fieldChange, 'farm._id');
        if (farmId) {
          const seasonFarmId = _.get(state, `oada.easonFarms_idByFarm_id.${farmId}.seasonFarm_id`)
          if (!seasonFarmId) {
            console.log('No matching season farm found for farmId:', farmId, 'Cannot check if season fields farm has changed. Data:', fieldChange);
          } else if (seasonField === null || seasonField.farm === null || seasonField.farm._id === null || (seasonFarmId !== null && seasonField.farm._id !== seasonFarmId)) {
            data.farm = _.merge({}, data.farm, {_id: seasonFarmId});
          }
        }
      }
      if (_.isEmpty(data)) return;
      requests.push(
        { //Change season's field's name, boundary
          tree,
          data,
          type: 'application/vnd.oada.field.1+json',
          path: `/bookmarks/seasons/2020/fields/${fieldChange.fieldId}` //TODO year
        }
      )
    })
    if (requests.length === 0) return;
    await actions.oada.put({requests, connection_id})
  },
  async changeSeasonFarms({state, actions}, changed) {
    /*
      Apply any changes to season farms
    */
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    //See if they match season fields.
    let requests = [];
    let seasonFarms = state.app.seasonFarms;
    _.forEach(changed, (change) => {
      if (change.farmId === null) return;
      let data = {};
      let seasonFarm = seasonFarms[change.farmId]
      //Check if name changed
      if (change.name) {
        if (seasonFarm === null || seasonFarm.name !== change.name) {
          data.name = change.name;
        }
      }
      if (_.isEmpty(data)) return;
      requests.push(
        { //Change season's farms's name
          tree,
          data,
          type: 'application/vnd.oada.farm.1+json',
          path: `/bookmarks/seasons/2020/farms/${change.farmId}` //TODO year
        }
      )
    })
    if (requests.length === 0) return;
    await actions.oada.put({requests, connection_id})
  },
  async deleteSeasonFields({state, actions}, deleted) {
    console.log('delete season fields', deleted);
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    //See if they match season fields.
    let requests = [];
    let seasonFields = state.app.seasonFields;
    _.forEach(deleted, (fieldId) => {
      let seasonField = seasonFields[fieldId]
      if (!seasonField) return;
      requests.push(
        { //Change season's farms's name
          tree,
          type: 'application/vnd.oada.field.1+json',
          path: `/bookmarks/seasons/2020/fields/${fieldId}` //TODO year
        }
      )
    })
    if (requests.length === 0) return;
    await actions.oada.delete({requests, connection_id})
  },
  async deleteSeasonFarms({state, actions}, deleted) {
    console.log('delete season farms', deleted);
    const myState = state.app.OADAManager;
    const {currentConnection: connection_id} = myState;
    //See if they match season fields.
    let requests = [];
    let seasonFarms = state.app.seasonFarms;
    _.forEach(deleted, (farmId) => {
      let seasonFarm = seasonFarms[farmId]
      if (!seasonFarm) return;
      requests.push(
        { //Change season's farms's name
          tree,
          type: 'application/vnd.oada.farm.1+json',
          path: `/bookmarks/seasons/2020/farms/${farmId}` //TODO year
        }
      )
    })
    if (requests.length === 0) return;
    await actions.oada.delete({requests, connection_id})
  },
  async login({actions, state}, {domain, token}) {
    const myState = state.app.OADAManager;
    const myActions = actions.app.OADAManager;
    myState.domain = domain;
    const {error} = await myActions.connect({domain, token});
    if (!error) {
      await myActions.getUserInfo();
//      await myActions.fetchAndWatch();
//      await myActions.initSeasonFarms();
//      await myActions.initSeasonFields();
      await actions.view.Map.zoomBounds();
      await actions.notes.initialize();
//      await actions.yield.initialize();
    }
  },
  async onFieldChanged({state, actions}, props) {
    /*
      If a farm/field in the master list changed, apply change to this years season fields
    */
    console.log('onFieldChanged', props);
    const myActions = actions.app.OADAManager;
    const changes = _.get(props, 'response.change') || [];
    if (!_.isArray(changes)) {
      console.warn('WARNING: response.change not an array')
      return;
    }
    let fieldsChanged = [];
    let fieldsDeleted = [];
    let farmsChanged = [];
    let farmsDeleted = [];
    _.forEach(changes, (change) => {
      if (change.type === 'merge') {
        //Get the currentState at the change path
        const changePathArr = change.path.split('/')
        if (_.get(changePathArr, 1) === 'fields') {
          //A field was changed
          const fieldId = _.get(changePathArr, 2)
          if (fieldId === null && _.get(change, 'body') !== null) {
            console.log('WARNING: Received a bad field change from OADA', props);
            return;
          }
          const {name, boundary} = _.get(change, 'body');
          //Push all non-undefined values
          fieldsChanged.push(_.pickBy({fieldId, name, boundary}, (a)=>!_.isUndefined(a)));
        } else if (_.get(changePathArr, 1) === 'farms') {
          //A farm was changed
          const farmId = _.get(changePathArr, 2)
          if (farmId === null && _.get(change, 'body') !== null) {
            console.log('WARNING: Received a bad farm change from OADA', props);
            return;
          }
          const {name} = _.get(change, 'body');
          //Push all non-undefined values
          farmsChanged.push(_.pickBy({farmId, name}, (a)=>!_.isUndefined(a)));
        }
      } else if (change.type === 'delete') {
        //Get the currentState at the change path
        //If body has a null field in it, delete that season field
        _.forEach(_.get(change, 'body.fields'), (value, fieldId) => {
          if (value === null) fieldsDeleted.push(fieldId);
        })
        //If body has a null farm in it, delete that season farm
        _.forEach(_.get(change, 'body.farms'), (value, farmId) => {
          if (value === null) farmsDeleted.push(farmId);
        })
      } else {
        console.warn('Unrecognized change type', change.type);
      }
    })
    if (fieldsDeleted.length > 0) myActions.deleteSeasonFields(fieldsDeleted);
    if (fieldsChanged.length > 0) myActions.changeSeasonFields(fieldsChanged);
    if (farmsDeleted.length > 0) myActions.deleteSeasonFarms(farmsDeleted);
    if (farmsChanged.length > 0) myActions.changeSeasonFarms(farmsChanged);
  },
  onSeasonsChanged({state, actions}, props) {

  }
}
