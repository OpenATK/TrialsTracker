import _ from 'lodash';
export default {
  open: false,
  name: '',
  farmSearch: '',
  farms: ({farmSearch: search}, state) => {
    return _.compact(_.map(state.app.seasonFarms, (f, id) => {
      if (!f || search !== '' && f.name && f.name.toLowerCase().search(search.toLowerCase()) === -1) return null;
      return {key: id, text: f.name, value: id};
    }))
  },
  farmId: null,
  farm: ({farmId, farms}, state) => {
    if (farmId) {
      return _.get(state, `app.seasonFarms.${farmId}`)
    }
  }
}
