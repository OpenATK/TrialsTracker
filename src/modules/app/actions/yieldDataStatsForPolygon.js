import cache from '../../Cache/cache.js';
import gh from 'ngeohash';
import gju from 'geojson-utils';
import { Promise } from 'bluebird';

export default function yieldDataStatsForPolygon(polygon, bbox, availableGeohashes, baseUrl, token) {
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  var strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
  var commonString = longestCommonPrefix(strings);
  var stats = {};
  return Promise.map(Object.keys(availableGeohashes), function(crop) {
    stats[crop] = { 
      area_sum: 0,
      weight_sum: 0,
      count: 0,
      mean_yield: 0,
    };
    return recursiveGeohashSum(polygon, commonString, stats[crop], availableGeohashes[crop], baseUrl+crop+'/geohash-length-index/', token)
      .then(function(newStats) {
        stats[crop].area_sum = newStats.area_sum;
        stats[crop].weight_sum = newStats.weight_sum;
        stats[crop].count = newStats.count;
        stats[crop].mean_yield = newStats.weight_sum/newStats.area_sum;
        return stats;
      })
  }).then(function() {
    return stats;
  })
}

function recursiveGeohashSum(polygon, geohash, stats, availableGeohashes, baseUrl, token) {
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
              return recursiveGeohashSum(polygon, g, stats, availableGeohashes, baseUrl, token)
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
        return recursiveGeohashSum(polygon, g, stats, availableGeohashes, baseUrl, token)
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
