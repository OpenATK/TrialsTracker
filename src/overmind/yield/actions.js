import {v1 as uuid} from 'uuid'
import gh from 'ngeohash';
import _ from 'lodash';
import {longestCommonPrefix, recursiveGeohashSearch } from './utils/recursiveGeohashSearch'
import Promise from 'bluebird'
//import * as fields from '@oada/fields-module/sequences'
import { geohashesFromTile, filterGeoahshes, drawTile } from './draw';
import harvest from './getHarvest'
import tree from './tree'

var createTileZ;

let t;
let A;
let C;
//TODO: Namespace this module and refer to it by the ns

export default {
  initialize({state, actions}, props) {
    //oadaMod.connect, just use OADA connection
    state.yield.connection_id = state.app.OADAManager.currentConnection;
//    props.actions = props.actions
    actions.yield.fetch(props || {});
  },
  fetch({actions, state}, props) {
    let acts = [...(props.actions || []), actions.yield.handleYieldIndexWatch];
    console.log('acts', acts)
    let connection_id = state.yield.connection_id;
    actions.oada.sync({
      path: '/bookmarks/harvest/tiled-maps/dry-yield-map',
      connection_id,
      tree,
      watch: {actions: acts},
    })
    actions.yield.mapOadaToYieldIndex();
  },
  mapOadaToYieldIndex({state}) {
    let id = state.yield.connection_id;
    let harvest = state.oada[id].bookmarks.harvest;
    if (harvest && harvest['tiled-maps'] && harvest['tiled-maps']['dry-yield-map']) {
      return Promise.map(Object.keys(harvest['tiled-maps']['dry-yield-map']['crop-index'] || {}), (crop) => {
        state.map.layers[crop.charAt(0).toUpperCase() + crop.slice(1)] = {visible: true};
        state.yield.index[crop] = {};
        return Promise.map(Object.keys(harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
          if (harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength])
          state.yield.index[crop][ghLength] = harvest['tiled-maps']['dry-yield-map']['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {};
          return
        })
      }).then(() => {
        return
      })
    }
    return
  },
  getPolygonStats({state, actions}, props) {
    let geohashes = actions.yield.polygonToGeohashes(props);
    //	geohashesToGeojson,
    return actions.yield.getStatsForGeohashes(props);
  },
  //Takes an array of polygons and returns the minimal set of geohashes to represent
  //that polygon geometry. 
  polygonToGeohashes({state}, props) {
    A = Date.now();
    return Promise.map((props.polygons || []), (obj) => {
      if (_.isEmpty(obj.polygon)) {
        var newObj = obj;
        newObj.geohashes = {};
        return Promise.resolve(newObj)
      };
      let newPoly = _.clone(obj.polygon);
      newPoly.push(obj.polygon[0])
      //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
      let strings = [gh.encode(obj.bbox.north, obj.bbox.west, 9),
        gh.encode(obj.bbox.north, obj.bbox.east, 9),
        gh.encode(obj.bbox.south, obj.bbox.east, 9),
        gh.encode(obj.bbox.south, obj.bbox.west, 9)];
      let commonString = longestCommonPrefix(strings);
      return recursiveGeohashSearch(newPoly, commonString, []).then((geohashes) => {
        var newObj = obj;
        newObj.geohashes = geohashes;
        return newObj;
      })
    }).then((polygons) => {
      return {polygons}
    })
  },
  // Takes the array of geohashes associated with each polygon and returns the
  // combined stats using those geohashes; returns the polygon object which
  // includes the following keys: id, type, polygon, geohashes, stats
  getStatsForGeohashes({state, effects}, props) {
    C = Date.now()
    let availableGeohashes = state.yield.index;
    return Promise.map(props.polygons || [], (obj, i) => {
      var stats = {};
      var geohashes = {};
      return Promise.map(Object.keys(availableGeohashes || {}), (crop) => {
        return Promise.map(Object.keys(obj.geohashes || {}), async (bucket) => {
          let ghLength = 'geohash-'+bucket.length;
          if (bucket.length < 3) {
            //TODO: handle this.  You' can't get aggregates of geohash-1 and 2
          }
          // Setup the geohashes part of a note's yield-stats
          geohashes[bucket] = geohashes[bucket] || {
            'crop-index': {}
          };
          // Skip geohashes that aren't available
          if (!availableGeohashes[crop][ghLength] || !availableGeohashes[crop][ghLength][bucket]){
            if (typeof obj.geohashes[bucket] === 'object') geohashes[bucket].aggregates = obj.geohashes[bucket];
            return geohashes[bucket]['crop-index'][crop] = {bucket: {}};
          }
          let path = '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/geohash-'+bucket.length+'/geohash-index/'+bucket;
          return effects.oada.get({
            connection_id: state.get('yield.connection_id'),
            path,
          }).then((response) => {
            let data = response.data;
            geohashes[bucket]['crop-index'][crop] = {
              bucket: {
                _id: response.headers['content-location'].replace(/^\//,''),
                _rev: response.headers['x-oada-rev']
              }
            }
            // Handle buckets that have aggregates
            if (typeof obj.geohashes[bucket] === 'object') {
              geohashes[bucket].aggregates = obj.geohashes[bucket];
              var ghData = data['geohash-data'] || {};
              return Promise.map(Object.keys(obj.geohashes[bucket] || {}), (geohash) => {
                stats[crop] = harvest.recomputeStats(stats[crop], ghData[geohash])
                return
              })
            }
            // Handle other buckets (no aggregates)
            stats[crop] = harvest.recomputeStats(stats[crop], data.stats)
            return
          }).catch((err) => {
            if (typeof obj.geohashes[bucket] === 'object') geohashes[bucket].aggregates = obj.geohashes[bucket];
            return geohashes[bucket]['crop-index'][crop] = {bucket: {}};
          })
        }, {concurrency: 10}).then(() => {
          stats[crop] = stats[crop] || {};
          stats[crop] = harvest.recomputeStats(stats[crop])
          if (stats[crop].count === 0) delete stats[crop]
          return
        })
      }, {concurrency: 10}).then(() => {
        var newObj = obj;
        newObj.geohashes = geohashes;
        newObj.stats = stats;
        return newObj
      })
    }, {concurrency: 10}).then((polygons) => {
      return {polygons}
    })
  },
}
/*
// Yield index updated. New crops or geohash tiles are now vailable.
const handleYieldIndexWatch = sequence('yield.handleYieldWatch', [
  equals(props`response.change.type`), {
  'delete': [
    //Delete case: clear data from tiles
      ({state, props, oada}) => {
        var geohashes = {};
        var connection_id = state.get('yield.connection_id');
        var body = props.response.change.body;
        var path = `/bookmarks/harvest/tiled-maps/dry-yield-map${props.nullPath}`
        var geohash = props.nullPath.split('/geohash-index/')[1].split('/')[0];
        var crop = props.nullPath.split('/crop-index/')[1].split('/')[0];
        var index = state.get(`yield.index.${crop}`);
        if (index['geohash-'+geohash.length][geohash]) {
          state.unset(`oada.${connection_id}.watches.${path}`)
          return oada.delete({
            path,
            unwatch: true,
            connection_id,
          }).catch((err) => {
            if (err.status === 404) return
          }).then(() => {
            return {
              geohashes: {[crop]: [geohash]},
            }
          })
        } else return {geohashes: {[crop]: [geohash]}}
      },
    ],
    'merge': [
    //Merge case: determine whether these new geohashes should be watched. 
      ({state, props, oada}) => {
        var connection_id = state.get('yield.connection_id');
        var geohashes = {};
        var body = props.response.change.body;
        return Promise.map(Object.keys(body['crop-index'] || {}), (crop) => {
          return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'] || {}), (ghLength) => {
            return Promise.map(Object.keys(body['crop-index'][crop]['geohash-length-index'][ghLength]['geohash-index'] || {}), (geohash) => {
              state.set(`yield.index.${crop}.geohash-${geohash.length}.${geohash}`, true)
              geohashes[crop] = geohashes[crop] || [];
              return geohashes[crop].push(geohash);
            })
          })
        }).then(() => {
          return {geohashes}
        })
      },
    ]
  },
  mapOadaToYieldIndex,
  drawTile
])

/*

const handleGeohashesOnScreen = sequence('yield.handleGeohashesOnScreen', [
  drawTile,
]);

const tileUnloaded = sequence('yield.tileUnloaded', [
  ({state, props, oada}) => {
    var connection_id = state.get('yield.connection_id');
    var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
    var geohashes = state.get(`yield.tilesOnScreen.${coordsIndex}`);
    var index = state.get(`yield.index.${props.layer}`);
    var watches = state.get(`oada.${connection_id}.watches`);
    return Promise.map(Object.keys(geohashes || {}), (geohash) => {
      if (geohash === 'coords') return
      let path = `/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/${props.layer}/geohash-length-index/geohash-${geohash.length}/geohash-index/${geohash}`
      if (!index['geohash-'+geohash.length][geohash]) return
      if (!watches[path]) return 
      state.unset(`oada.${connection_id}.watches.${path}`)
      return oada.delete({
        path,
        unwatch: true,
        connection_id,
      }).catch((err) => {
        if (err.status === 404) return
      })
    }).then(()=> {
      return state.unset(`yield.tilesOnScreen.${coordsIndex}`);
    })
  },
]);

const createTile = sequence('yield.createTile', [
  ({props}) => {createTileZ = props.coords.z},
  wait(500),
  when(props`coords.z`,(z) => z === createTileZ), {
    true: [
      geohashesFromTile,
      addGeohashesOnScreen,
      drawTile,
    ],
    false: [],
  }
])



function addGeohashesOnScreen({props, state}) {
// This case occurs before a token is available. Just save all geohashes and
// filter them later when the list of available geohashes becomes known.
	var coordsIndex = props.coords.z.toString() + '-' + props.coords.x.toString() + '-' + props.coords.y.toString();
	state.set(`yield.tilesOnScreen.${coordsIndex}.coords`, props.coords);
  return Promise.map(Object.keys(props.geohashes || {}), (crop) => {
	  return Promise.map(props.geohashes[crop] || [], (geohash) => {
		  return state.set(`yield.tilesOnScreen.${coordsIndex}.${geohash}`, true);
    })
	}).then(() => {
		return
	})
}



function geohashesToGeojson({state}, props) {
	let a = Date.now()
	let geohashPolygons = [];
	return Promise.map(props.polygons || [], (obj) => {
		geohashPolygons = [];
		return Promise.map(Object.keys(obj.geohashes || {}), (geohash) => {
      let ghBox = gh.decode_bbox(geohash);
      //create an array of vertices in the order [nw, ne, se, sw]
      let geohashPolygon = [
        [ghBox[1], ghBox[2]],
        [ghBox[3], ghBox[2]],
        [ghBox[3], ghBox[0]],
        [ghBox[1], ghBox[0]],
        [ghBox[1], ghBox[2]],
      ];
      geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
		}, {concurrency: 10}).then((result) => {
			state.set(`map.geohashPolygons`, geohashPolygons)
			return obj
		})
	}).then((polygons) => {
		state.set(`map.geohashPolygons`, geohashPolygons)
		return {polygons}
	})
}


*/

function getGeohashLevel(zoom, sw, ne) {                                         
  if (zoom >= 15) return 7;                                                      
  if (zoom >= 12) return 6;                                                      
  if (zoom >= 8) return 5;                                                       
  if (zoom >= 6) return 4;                                                       
  if (zoom <= 5) return 3;                                                       
}     
