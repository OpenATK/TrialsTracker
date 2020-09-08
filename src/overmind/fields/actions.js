import tree from './tree';
import config from '../../../config'
import Promise from 'bluebird'
import _ from 'lodash'
import { browser as oadaIdClient } from '@oada/oada-id-client/index.js'
const getAccessToken = Promise.promisify(oadaIdClient.getAccessToken)

export default {
  async initialize({actions, state}) {
    //Fetch field and seasons
    await actions.oada.sync({
      path: '/bookmarks/fields',
      connection_id: state.app.OADAManager.currentConnection,
      tree,
      actions: [actions.app.OADAManager.onFieldChanged]
    })
  },
  async mapFieldsToNotes({actions, state}) {
    let connection_id = state.app.OADAManager.currentConnection,
//    let fieldNotes = state.notes.fields;
    let oadaFields = state.oada[connection_id].bookmarks.fields.fields || {};
    Object.keys(oadaFields).forEach((key, i) => {
      let field = oadaFields[key];
      let { geojson } = state.notes[type][id].boundary;
      let {area, bbox, centroid} = actions.view.Map.getGeometryABCs(geojson);
      let stats = actions.notes.getStats(geojson);
      state.notes.fields[key] = {
        time: Date.now(),
        id: key,
        text: fields.name + ' - ' + fields.farm.name,
        tags: [],
        fields: {},
        boundary: { geojson, bbox, centroid, area },
        color: rmc.getColor(),
        stats,
        order: i,
        visible: true,
      }
    })

  },
}
