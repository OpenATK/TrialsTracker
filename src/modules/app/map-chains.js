import _ from 'lodash';
import geolib from 'geolib';
import gh from 'ngeohash';
import { Promise } from 'bluebird';
import PouchDB from 'pouchdb';
import cache from '../../components/RasterLayer/cache.js';
import gju from 'geojson-utils';

var mouse_up_flag = false;
var mouse_down_flag = false;

export var handleMouseDown = [
 dropPoint 
];

export var mouseMoveOnmap = [
//  mapMouseMove
];

export var mouseUpOnmap = [
  mapMouseUp
];

export var ToggleMap = [
  dragMapToggle
];

export var mouseDown = [
  
];

export var drawOnMap = [
];

export var drawComplete = [
  setDrawMode, computeBoundingBox, computeStats
];

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
  console.log(strings);
  var A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}
function recursiveGeohashSum(polygon, geohash, stats, db, token, availableGeohashes) {
  console.log('AAAA - recursive stats', geohash, geohash.length);
  return Promise.try(function() {
    if (geohash.length == 7) {
      console.log('getting raw data');
      console.log(!availableGeohashes[geohash]);
      if (!availableGeohashes[geohash]) return null;
      return cache.get(geohash, token, db)
      .then(function(data) {
        console.log('HHHH - got stats from cache/server', geohash, geohash.length);
        console.log(geohash, data);
        if (!data) return null;
        var pts = Object.keys(data.data);
        var newStats = {
          sum: 0,
          count: 0,
        };
        return Promise.map(pts, function(pt) {
          var pnt = {"type":"Point","coordinates": [data.data[pt].location.lon, data.data[pt].location.lat]};
          if (gju.pointInPolygon(pnt, polygon)) {
            console.log('contained');
            newStats.sum += data.data[pt].value;
            newStats.count++;
          } 
          return null;
        }).then(function() {
          console.log(newStats);
          return newStats;
        });
      });
    }

    var ghBox = gh.decode_bbox(geohash);
    //create an array of vertices in the order [nw, ne, se, sw]
    var polyIn = [
      [ghBox[1], ghBox[2]],
      [ghBox[3], ghBox[2]],
      [ghBox[3], ghBox[0]],
      [ghBox[1], ghBox[0]],
      [ghBox[1], ghBox[2]],
    ];
   console.log(polygon);
//Test for intersection; If so, get finer geohash
    for (var i = 0; i < polygon.length-1; i++) {
      for (var j = 0; j < polyIn.length-1; j++) {
        var lineA = {"type": "LineString", "coordinates": [polygon[i], polygon[i+1]]};
        var lineB = {"type": "LineString", "coordinates": [polyIn[j], polyIn[j+1]]};
        if (gju.linesIntersect(lineA, lineB)) {
          console.log('going deeper');
          //partially contained, dig into deeper geohashes
          var geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
          console.log(geohash, geohashes);
          return Promise.map(geohashes, function(geohash) {
            return recursiveGeohashSum(polygon, geohash, stats, db, token)
            .then(function (newStats) {
              console.log('CCCC - .then on recurs inside promise.map', geohash, geohash.length);
              console.log(newStats);
/*
              stats.area_sum += data.aggregates.stats.area_sum;
              stats.bushels_sum += data.aggregates.stats.bushels_sum;
              stats.count += data.aggregates.stats.count;
*/
              stats.sum += newStats.sum;
              stats.count += newStats.count;
              return stats;
            });
          }).then(function() {
            console.log('DDDD - .then on recurs promise.map', geohash, geohash.length);
            return stats;
          });
        }
      }
    }
// No intersection. Test if completely inside. If so, use the stats.
    console.log('no intersection');
    var pt = {"type":"Point","coordinates": polyIn[0]};
    if (gju.pointInPolygon(pt, polygon)) {
      console.log('getting geohash');
      if (!availableGeohashes[geohash]) return null;
      return cache.get(geohash.substr(0, geohash.length-3), token, db)
      .then(function(data) {
        console.log('BBBB - got stats from cache/server', geohash, geohash.length);
        console.log(data.aggregates[geohash].stats);
/*
        stats.area_sum += data.aggregates.stats.area_sum;
        stats.bushels_sum += data.aggregates.stats.bushels_sum;
        stats.count += data.aggregates.stats.count;
*/
        var newStats = {
          sum: data.aggregates[geohash].stats.sum,
          count: data.aggregates[geohash].stats.count,
        };
        console.log(newStats);
        return newStats;
      });
    }
    return null;
  }).then(function(newStats) {
    console.log('EEEE - .then on recurs promise.try', geohash, geohash.length);
    console.log(newStats);
    return newStats;
  });
}

function computeStats({input, state}) {
//Get the geohashes that fall inside the bounding box to subset the
//data points to evaluate. Create an array of promises to return the
//data from the db, calculate the average and count, then save to state.
  var db = new PouchDB('yield-data');
  Promise.map(input.bboxes, function(bbox, i) {
    var id = input.ids[i];
    var nw = L.latLng(bbox.north, bbox.west),
        ne = L.latLng(bbox.north, bbox.east),
        se = L.latLng(bbox.south, bbox.east),
        sw = L.latLng(bbox.south, bbox.west);
    var strings = [gh.encode(bbox.north, bbox.west, 9),
      gh.encode(bbox.north, bbox.east, 9),
      gh.encode(bbox.south, bbox.east, 9),
      gh.encode(bbox.south, bbox.west, 9)];
    var commonString = longestCommonPrefix(strings);
    var polygon = state.get(['app', 'model', 'notes', id, 'geometry']);
    var geohashes = gh.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, commonString.length+1);
    var stats = {
 //     area_sum: 0,
 //     bushels_sum: 0,
      sum: 0,
      count: 0,
    };
    var token = state.get(['app', 'token']).access_token;
    console.log(geohashes);
    var availableGeohashes = state.get(['app', 'model', 'available_geohashes']);
    return Promise.map(geohashes, function(geohash) {
      return recursiveGeohashSum(polygon, geohash, stats, db, token, availableGeohashes)
      .then(function(newStats) {
        console.log('GGGG - .then on computeStats recurs promise', geohash, geohash.length);
        console.log(newStats);
/*
        stats.area_sum += newStats.area_sum;
        stats.bushels_sum += newStats.bushels_sum;
        stats.count += newStats.count;
*/
        stats.sum += newStats.sum;
        stats.count += newStats.count;
        return stats;
      });
    }).then(function() {
      console.log('FFFF - The End.  .then on computeStats promise.map');
      console.log(stats);
//      state.set(['app', 'model', 'notes', id, 'area_sum'], stats.area_sum);
//      state.set(['app', 'model', 'notes', id, 'bushels_sum'], stats.bushels_sum);
      state.set(['app', 'model', 'notes', id, 'sum'], stats.sum);
      state.set(['app', 'model', 'notes', id, 'count'], stats.count);
      state.set(['app', 'model', 'notes', id, 'mean'], stats.sum/stats.count);
    });
  });
};

function computeBoundingBox({input, state, output}) {
  var bboxes = [];
  for (var i = 0; i < input.ids.length; i++) {
    var id = input.ids[i];
    var coords = state.get(['app', 'model', 'notes', id, 'geometry', 'coordinates', 0]);
    console.log(JSON.stringify(state.get(['app', 'model', 'notes', id, 'geometry'])));
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
    state.set(['app', 'model', 'notes', id, 'bbox'], bbox);
    console.log(bbox);
    bboxes.push(bbox);
    console.log(bboxes);
  }
  output({bboxes});
};

function setDrawMode({input, state}) {
  state.set(['app', 'view', 'draw_mode'], input.drawMode); 
};

function dropPoint ({input, state}) {
  if(state.get(['app', 'view', 'draw_mode']) == true){
    mouse_up_flag = false;
    var currentSelectedNoteId = input.select_note;
    _.each(state.get(['app', 'model', 'notes']), function(note) {
      if (note.id === currentSelectedNoteId) {
        var pt = [input.pt.lng, input.pt.lat];
        state.push(['app', 'model', 'notes', note.id, 'geometry', 'coordinates', 0], pt);
      }
    });
    mouse_down_flag = true;
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



