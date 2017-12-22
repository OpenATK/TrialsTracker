import Promise from 'bluebird';  
import yieldDataStatsForPolygon from '../../Yield/utils/yieldDataStatsForPolygon.js';

function getFieldStats({state, path}) {
  let fields = state.get('Fields');
  let availableGeohashes = state.get('Yield.data_index');
  if (!(fields && availableGeohashes)) return path.error({});
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
  let baseUrl = domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
	let stats = {};
	return Promise.each(Object.keys(fields), (field, idx) => {
    return yieldDataStatsForPolygon(fields[field].boundary.geojson.coordinates[0], fields[field].boundary.bbox, availableGeohashes, baseUrl, token)
    .then((fieldStats) => {
      stats[field] = fieldStats.stats;
      return stats;
    })
  }).then((res) => { 
    return path.success({stats});
  }).catch((error) => {
    console.log(error);
    return path.error({error})
  })
}
export default getFieldStats;
