import Promise from 'bluebird';  
import yieldDataStatsForPolygon from '../../Map/actions/yieldDataStatsForPolygon.js';

export default function computeFieldStats({state, path}) {
  let fields = state.get(['App', 'model', 'fields']);
  let availableGeohashes = state.get(['App', 'model', 'yield_data_index']);
  if (!(fields && availableGeohashes)) return path.error({});
  let token = state.get('App.settings.data_sources.yield.oada_token');
  let domain = state.get('App.settings.data_sources.yield.oada_domain');
  let baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  let stats = {};
  return Promise.each(Object.keys(fields), function(field) {
    return yieldDataStatsForPolygon(fields[field].boundary.geojson.coordinates[0], fields[field].boundary.bbox, availableGeohashes, baseUrl, token)
    .then((fieldStats) => {
      stats[field] = fieldStats.stats;
      return stats;
    })
  }).then((res) => { 
    let ids = Object.keys(state.get(['App', 'model', 'notes']));
    return path.success({stats, ids});
  }).catch((error) => {
    console.log(error);
    return path.error({error})
  })
}
