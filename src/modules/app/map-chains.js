import { set } from 'cerebral/operators';
import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import PouchDB from 'pouchdb';
import cache from '../Cache/cache.js';
import gju from 'geojson-utils';
import gjArea from 'geojson-area';
import computeBoundingBox from './utils/computeBoundingBox.js';
import polygonContainsPolygon from './utils/polygonContainsPolygon.js';

export var calculatePolygonArea = [
  recalculateArea,
];

export var handleMouseDown = [
 dropPoint
];

export var undoDrawPoint = [
  undo,
];

export var drawComplete = [
  set('state:app.view.map.drawing_note_polygon', false), setWaiting, getNoteBoundingBox, {
    success: [setBoundingBox, computeStats, {
      success: [setStats, setNoteFields],
      error: [],
    }],
    error: [],
  },
];

export var handleDrag = [
  setMarkerPosition, recalculateArea
];

function setNoteFields({input, state}) {
  var note = state.get(['app', 'model', 'notes', input.id]);
  var fields = state.get(['app', 'model', 'fields']);
  Object.keys(fields).forEach((field) => {
    if (polygonContainsPolygon(fields[field].boundary.geojson.coordinates[0], note.geometry.geojson.coordinates[0])) {
      //get the field average for each crop and compare to note average
      var obj = {};
      Object.keys(fields[field].stats).forEach((crop) => {
        if (note.stats[crop]) {
          obj[crop] = {
            difference: note.stats[crop].mean_yield - fields[field].stats[crop].mean_yield
          }
        }
      })
    }
    state.set(['app', 'model', 'notes', input.id, 'fields', field], obj);
  })
}


function setWaiting({input, state}) {
  state.set(['app', 'model', 'notes', input.id, 'stats', 'computing'], true);
}

function setMarkerPosition({input, state}) {
  var id = state.get('app.view.selected_note');
  state.set(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0, input.idx], [input.lng, input.lat])
}

function recalculateArea({state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', id]);
  var area = gjArea.geometry(note.geometry.geojson)/4046.86;
  state.set(['app', 'model', 'notes', id, 'area'], area);
}

function undo({input, state}) {
  state.pop(['app', 'model', 'notes', input.id, 'geometry', 'geojson', 'coordinates']);
}

//http://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
function longestCommonPrefix(strings) {
  var A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

function computeStats({input, state, output}) {
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var token = state.get(['app', 'view', 'server', 'token']);
  var domain = state.get(['app', 'view', 'server', 'domain']);
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  var nw = L.latLng(input.bbox.north, input.bbox.west),
      ne = L.latLng(input.bbox.north, input.bbox.east),
      se = L.latLng(input.bbox.south, input.bbox.east),
      sw = L.latLng(input.bbox.south, input.bbox.west);
  var strings = [gh.encode(input.bbox.north, input.bbox.west, 9),
    gh.encode(input.bbox.north, input.bbox.east, 9),
    gh.encode(input.bbox.south, input.bbox.east, 9),
    gh.encode(input.bbox.south, input.bbox.west, 9)];
  var commonString = longestCommonPrefix(strings);
  var polygon = state.get(['app', 'model', 'notes', input.id, 'geometry', 'geojson', 'coordinates'])[0];
  var stats = {};
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  Promise.map(Object.keys(availableGeohashes), function(crop) {
    var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/';
    stats[crop] = { 
      area_sum: 0,
      weight_sum: 0,
      count: 0,
      mean_yield: 0,
    };
    return recursiveGeohashSum(polygon, commonString, crop, stats[crop], availableGeohashes[crop], baseUrl, token).then(function(newStats) {
      stats[crop].area_sum = newStats.area_sum;
      stats[crop].weight_sum = newStats.weight_sum;
      stats[crop].count = newStats.count;
      stats[crop].mean_yield = newStats.weight_sum/newStats.area_sum;
      return stats;
    })
  }).then(function() {
    output.success({stats});
  })
}
computeStats.outputs = ['success', 'error'];
computeStats.async = true;

function setStats({input, state}) {
  Object.keys(input.stats).forEach(function(crop) {
    if (isNaN(input.stats[crop].mean_yield)) {
      state.unset(['app', 'model', 'notes', input.id, 'stats', crop]);
    } else {
      state.set(['app', 'model', 'notes', input.id, 'stats', crop], input.stats[crop]);
    }
  })
  state.unset(['app', 'model', 'notes', input.id, 'stats', 'computing']);
}

function recursiveGeohashSum(polygon, geohash, crop, stats, availableGeohashes, baseUrl, token) {
  return Promise.try(function() {
    if (!availableGeohashes['geohash-'+geohash.length]) {
      return stats;
    }
    if (!availableGeohashes['geohash-'+geohash.length][geohash]) {
      return stats;
    }

    var ghBox = gh.decode_bbox(geohash);
    //create an array of vertices in the order [nw, ne, se, sw]
    var geohashPolygon = [
      [ghBox[1], ghBox[2]],
      [ghBox[3], ghBox[2]],
      [ghBox[3], ghBox[0]],
      [ghBox[1], ghBox[0]],
      [ghBox[1], ghBox[2]],
    ];
//1. If the polygon and geohash intersect, get a finer geohash.
    for (var i = 0; i < polygon.length-1; i++) {
      for (var j = 0; j < geohashPolygon.length-1; j++) {
        var lineA = {"type": "LineString", "coordinates": [polygon[i], polygon[i+1]]};
        var lineB = {"type": "LineString", "coordinates": [geohashPolygon[j], geohashPolygon[j+1]]};
        if (gju.lineStringsIntersect(lineA, lineB)) {
          //partially contained, dig into deeper geohashes
          if (geohash.length == 7) {
            var url = baseUrl + 'geohash-7/geohash-index/' + geohash + '/geohash-data/';
            return cache.get(url, token).then(function(geohashes) {
              Object.keys(geohashes).forEach(function(g) {
                var ghBox = gh.decode_bbox(g);
                var pt = {"type":"Point","coordinates": [ghBox[1], ghBox[0]]};
                var poly = {"type":"Polygon","coordinates": [polygon]};
                if (gju.pointInPolygon(pt, poly)) {
                  stats.area_sum += geohashes[g].area.sum;
                  stats.weight_sum += geohashes[g].weight.sum;
                  stats.count += geohashes[g].count;
                }
                return stats;
              })
            })
          } else {
            var geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
            return Promise.each(geohashes, function(g) {
              return recursiveGeohashSum(polygon, g, crop, stats, availableGeohashes, baseUrl, token)
              .then(function (newStats) {
                if (newStats == null) return stats;
                return newStats;
              })
            })
          }
        }
      }
    }
//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
    var pt = {"type":"Point","coordinates": geohashPolygon[0]};
    var poly = {"type":"Polygon","coordinates": [polygon]};
    if (gju.pointInPolygon(pt, poly)) {
      var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2) +'/geohash-data/'+geohash;
      return cache.get(url, token).then(function(data) {
        stats.area_sum += data.area.sum;
        stats.weight_sum += data.weight.sum;
        stats.count += data.count;
        return stats;
      })
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1.
    pt = {"type":"Point","coordinates": polygon[0]};
    poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length == 7) {
        var url = baseUrl + 'geohash-7/geohash-index/' + geohash + '/geohash-data/';
        return cache.get(url, token).then(function(geohashes) {
          Object.keys(geohashes).forEach(function(g) {
            var ghBox = gh.decode_bbox(g);
            var pt = {"type":"Point","coordinates": [ghBox[1], ghBox[0]]};
            var poly = {"type":"Polygon","coordinates": [polygon]};
            if (gju.pointInPolygon(pt, poly)) {
              stats.area_sum += g.area.sum;
              stats.weight_sum += g.weight.sum;
              stats.count += g.stats.count;
            }
            return stats;
          })
        })
      }
      var geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
      return Promise.each(geohashes, function(g) {
        return recursiveGeohashSum(polygon, g, crop, stats, availableGeohashes, baseUrl, token)
        .then(function (newStats) {
          if (newStats == null) return stats;
          return newStats;
        })
      })
    }
//4. The geohash and polygon are non-overlapping.
    return stats;
  }).then(function() {
    return stats;
  })
}

function getNoteBoundingBox({input, state, output}) {
  var selectedNote = state.get(['app', 'view', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', selectedNote]);
  var bbox = computeBoundingBox(note.geometry.geojson);
  var area = gjArea.geometry(note.geometry.geojson)/4046.86; 
  output.success({bbox, area, id: selectedNote});
}

function setBoundingBox({input, state, output}) {
  state.set(['app', 'model', 'notes', input.id, 'geometry', 'bbox'], input.bbox);
  state.set(['app', 'model', 'notes', input.id, 'geometry', 'centroid'], [(input.bbox.north + input.bbox.south)/2, (input.bbox.east + input.bbox.west)/2]);
  state.set(['app', 'model', 'notes', input.id, 'area'], input.area);
}

function dropPoint ({input, state}) {
  var id = state.get(['app', 'view', 'selected_note']);
  state.push(['app', 'model', 'notes', id, 'geometry', 'geojson', 'coordinates', 0], input.pt);
}
