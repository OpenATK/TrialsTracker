import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import PouchDB from 'pouchdb';
import cache from '../../components/RasterLayer/cache.js';
import gju from 'geojson-utils';
import gjArea from 'geojson-area';

var mouse_up_flag = false;
var mouse_down_flag = false;

export var calculatePolygonArea = [
  recalculateArea,
];

export var handleMouseDown = [
 dropPoint
];

export var mouseUpOnmap = [
  mapMouseUp
];

export var ToggleMap = [
  dragMapToggle
];

export var undoDrawPoint = [
  undo,
];

export var drawComplete = [
  setDrawMode, computeBoundingBox, {
    success: [setBoundingBox, computeStats, {
      success: [setStats],
      error: [],
    }],
    error: [],
  },
];

function recalculateArea({state}) {
  var id = state.get(['app', 'model', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', id]);
  var area = gjArea.geometry(note.geometry)/4046.86;
  state.set(['app', 'model', 'notes', id, 'area'], area);
}

function undo({input, state}) {
  console.log(state.get(['app', 'model', 'notes', input.id, 'geometry', 0]));
  state.pop(['app', 'model', 'notes', input.id, 'geometry']);
}

function contains(polyOut, polyIn) {
  for (var i = 0; i < polyOut.length-1; i++) {
    for (var j = 0; j < polyIn.length-1; j++) {
      var lineA = {"type": "LineString", "coordinates": [polyOut[i], polyOut[i+1]]};
      var lineB = {"type": "LineString", "coordinates": [polyOut[j], polyOut[j+1]]};
      if (gju.linesIntersect(lineA, lineB)) return true;
    }
  }
  var pt = {"type":"Point","coordinates": polyIn[0]};
  if (gju.pointInPolygon(pt, polyOut)) return true;
  return false;
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
  var token = state.get(['app', 'token']);
  var domain = state.get(['app', 'model', 'domain']);
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
  //console.log('Common String: ', commonString, commonString.length);
  var polygon = state.get(['app', 'model', 'notes', input.id, 'geometry', 'coordinates'])[0];
  var stats = {};
  var token = state.get(['app', 'token']);
  var availableGeohashes = state.get(['app', 'model', 'yield_data_index']);
  return Promise.map(Object.keys(availableGeohashes), function(crop) {
    var baseUrl = 'https://' + domain + '/bookmarks/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/';
    stats[crop] = { 
      area_sum: 0,
      weight_sum: 0,
      count: 0,
      mean_yield: 0,
    };
    return recursiveGeohashSum(polygon, commonString, crop, stats[crop], availableGeohashes, baseUrl, token)
    .then(function(newStats) {
      //console.log('GGGG - .then on computeStats recurs promise', commonString, commonString.length);
      stats[crop].area_sum = newStats.area_sum;
      stats[crop].weight_sum = newStats.weight_sum;
      stats[crop].count = newStats.count;
      stats[crop].mean_yield = newStats.weight_sum/newStats.area_sum;
      return stats;
    })
  }).then(function() {
    //console.log('FFFF - The End.  .then on computeStats promise.map');
    output.success({stats});
  })
}
computeStats.outputs = ['success', 'error'];
computeStats.async = true;

function setStats({input, state, output}) {
  Object.keys(input.stats).forEach(function(crop) {
    state.set(['app', 'model', 'notes', input.id, 'stats', crop], input.stats[crop]);
  })
}

function recursiveGeohashSum(polygon, geohash, crop, stats, availableGeohashes, baseUrl, token) {
  //console.log('AAAA - recursive stats', geohash, geohash.length);
  return Promise.try(function() {
    var ghBox = gh.decode_bbox(geohash);
    //create an array of vertices in the order [nw, ne, se, sw]
    var geohashPolygon = [
      [ghBox[1], ghBox[2]],
      [ghBox[3], ghBox[2]],
      [ghBox[3], ghBox[0]],
      [ghBox[1], ghBox[0]],
      [ghBox[1], ghBox[2]],
    ];
//1. Test for intersection; If so, get a finer geohash.
    for (var i = 0; i < polygon.length-1; i++) {
      for (var j = 0; j < geohashPolygon.length-1; j++) {
        var lineA = {"type": "LineString", "coordinates": [polygon[i], polygon[i+1]]};
        var lineB = {"type": "LineString", "coordinates": [geohashPolygon[j], geohashPolygon[j+1]]};
        //console.log('1', gju.lineStringsIntersect(lineA, lineB));
        if (gju.lineStringsIntersect(lineA, lineB)) {
          //partially contained, dig into deeper geohashes
          if (geohash.length == 9) return stats;
          //console.log('?????????? Intersection.  Digging further', geohash, geohash.length);
          var geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
          return Promise.each(geohashes, function(g) {
            return recursiveGeohashSum(polygon, g, crop, stats, availableGeohashes, baseUrl, token)
            .then(function (newStats) {
              if (newStats == null) return stats;
              //console.log('CCCC - .then on recurs inside promise.map', g, g.length);
              return newStats;
            });
          })
        }
      }
    }
//2. Test if geohash is completely inside polygon. If so, use the stats.
    var pt = {"type":"Point","coordinates": geohashPolygon[0]};
    var poly = {"type":"Polygon","coordinates": [polygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (!availableGeohashes[crop][geohash]) return stats;
      var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/' + geohash.substring(0, geohash.length-2) + '/geohash-data/';
      //console.log('!!!!completely contained; getting data', geohash, geohash.length);
      return cache.get(url, token).then(function(data) {
        //console.log('BBBB - got stats from cache/server', geohash, geohash.length);
        stats.area_sum += data[geohash].area.sum;
        stats.weight_sum += data[geohash].weight.sum;
        stats.count += data[geohash].count;
        return stats;
      });
    }
//3. Now test if polygon is completely inside geoahash.  If so, dig deeper.
    pt = {"type":"Point","coordinates": polygon[0]};
    poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length == 9) return stats;
      //console.log('~~~~polygon inside geohash. Digging further.', geohash, geohash.length);
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
    //console.log('EEEE - .then on recurs promise.try', geohash, geohash.length);
    return stats;
  });
}

function computeBoundingBox({input, state, output}) {
  var bbox;
  var selectedNote = state.get(['app', 'model', 'selected_note']);
  var note = state.get(['app', 'model', 'notes', selectedNote]);
  var coords = state.get(['app', 'model', 'notes', input.id, 'geometry', 'coordinates', 0]);
  var north = coords[0][1];
  var south = coords[0][1];
  var east = coords[0][0];
  var west = coords[0][0];
  for (var j = 0; j < coords.length; j++) {
    if (coords[j][1] > north) north = coords[j][1];
    if (coords[j][1] < south) south = coords[j][1];
    if (coords[j][0] > east) east = coords[j][0];
    if (coords[j][0] < west) west = coords[j][0];
  }
  var bbox = {north, south, east, west};
  var area = gjArea.geometry(note.geometry)/4046.86; 

  output.success({bbox, area, id: selectedNote});
};

function setBoundingBox({input, state, output}) {
  state.set(['app', 'model', 'notes', input.id, 'bbox'], input.bbox);
  state.set(['app', 'model', 'notes', input.id, 'area'], input.area);
}

function setDrawMode({input, state}) {
  state.set(['app', 'view', 'draw_mode'], false); 
};

function dropPoint ({input, state}) {
  if (state.get(['app', 'view', 'draw_mode']) == true){
    //mouse_up_flag = false;
    var id = state.get(['app', 'model', 'selected_note']);
    var pt = [input.pt.lng, input.pt.lat];
    state.push(['app', 'model', 'notes', id, 'geometry', 'coordinates', 0], pt);
    //mouse_down_flag = true;
  }
};

function mapMouseMove ({input, state}) {
  if(state.get(['app', 'view', 'draw_mode']) === true){
    var vertex = [input.vertex_value.lng, input.vertex_value.lat];
    var currentSelectedNoteId = input.selected_note;

    if (mouse_up_flag === true) {
      mouse_down_flag = false;
    }
  
    if (mouse_down_flag === true) {
      _.each(state.get(['app', 'model', 'notes']), function(note) {
        if(note.id === currentSelectedNoteId){
        
          var coor_array = state.get(['app', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0']);
          var coor_arr_length = coor_array.length;

          state.set(['app', 'model', 'notes', note.id, 'geojson', 'features', '0', 'geometry', 'coordinates', '0', '0', (coor_arr_length-1)], vertex);
        }
      });
    }
  }
};

function mapMouseUp ({input, state}) {
  if(state.get(['app', 'view', 'draw_mode']) === true){
    mouse_up_flag = true;
  }
};


function dragMapToggle ({state}) {
  if (state.get(['app', 'view', 'drag'])) {
    state.set(['app', 'view', 'drag'], false);
  } else {
    state.set(['app', 'view', 'drag'], true);
  }
};



