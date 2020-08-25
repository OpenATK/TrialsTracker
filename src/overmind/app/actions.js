import _ from 'lodash'
export default {
  getSeasonField({state}, id) {
    let fields = [];
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      fields = _.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.fields`) //TODO year
    } else {
      fields = _.get(state, `app.localData.abc123.seasons.2020.fields`) //TODO year, organization
    }
    return fields[id];
  },
  getSeasonFarm({state}, id) {
    let farms = [];
    if (_.get(state, `app.OADAManager.connected`) === true) {
      let currentConnection = _.get(state, `app.OADAManager.currentConnection`)
      farms = _.get(state, `oada.${currentConnection}.bookmarks.seasons.2020.farms`) //TODO year
    } else {
      farms = _.get(state, `app.localData.abc123.seasons.2020.farms`) //TODO year, organization
    }
    return farms[id];
  },
  onInitialize({state, actions}) {
    actions.view.Map.zoomBounds();
  }
}
