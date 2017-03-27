import { Promise } from 'bluebird';  
var agent = require('superagent-promise')(require('superagent'), Promise);
import yieldDataStatsForPolygon from '../../Map/actions/yieldDataStatsForPolygon.js';

export default function computeFieldStats({input, state, output}) {
  console.log('computing Field Stats');
  var fields = state.get(['app', 'model', 'fields']);
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  if (!(fields && availableGeohashes)) output.error({});
  var token = state.get('app.settings.data_sources.yield.oada_token');
  var domain = state.get('app.settings.data_sources.yield.oada_domain');
  var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  var stats = {};
  console.log('calling yieldDataStats from computeFieldStats');
  Promise.map(Object.keys(fields), function(field) {
    return yieldDataStatsForPolygon(fields[field].boundary.geojson.coordinates[0], fields[field].boundary.bbox, availableGeohashes, baseUrl, token)
    .then((fieldStats) => {
      stats[field] = fieldStats;
      return stats;
    })
  }).then(() => { 
  console.log('finished yieldDataStats from computeFieldStats');
    var ids = Object.keys(state.get(['app', 'model', 'notes']));
    output.success({stats, ids});
  }).catch((error) => {
    console.log(error);
    output.error({error})
  })
}
computeFieldStats.outputs = ['success', 'error'];
computeFieldStats.async = true;
