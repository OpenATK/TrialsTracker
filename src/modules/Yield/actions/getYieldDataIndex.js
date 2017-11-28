import cache from '../../Cache'
import Promise from 'bluebird'

function getYieldDataIndex({state, path}) {
  let token = state.get('Connections.oada_token');
  let domain = state.get('Connections.oada_domain');
  let url = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/';
  let data = {};
  let cropStatus = {};
  return cache.get(url, token).then((crops) => {
    return Promise.each(Object.keys(crops), (crop) => {
      data[crop] = {};
      return cache.get(url + crop + '/geohash-length-index', token).then((geohashLengthIndex) => {
        return Promise.each(Object.keys(geohashLengthIndex), (ghLength) => {
          data[crop][ghLength] = data[crop][ghLength] || {};
          return cache.get(url + crop + '/geohash-length-index/' + ghLength + '/geohash-index', token).then((ghIndex) => {
            return Promise.each(Object.keys(ghIndex), (bucket) => {
              return data[crop][ghLength][bucket] = bucket;
            })
          })
        })
      })
    })
  }).then(() => {
    return path.success({data, cropStatus});
  })
}
export default getYieldDataIndex;
