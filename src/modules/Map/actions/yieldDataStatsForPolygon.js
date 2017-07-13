import cache from '../../Cache';
import gh from 'ngeohash';
import gju from 'geojson-utils';
import { Promise } from 'bluebird';

export default function yieldDataStatsForPolygon(polygon, bbox, availableGeohashes, baseUrl, token) {
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
  let commonString = longestCommonPrefix(strings);
  let stuff = {};
  stuff.stats = {};
  stuff.geohashPolygons = [];
  return Promise.each(Object.keys(availableGeohashes), function(crop) {
    stuff.stats[crop] = { 
      area_sum: 0,
      weight_sum: 0,
      count: 0,
      mean_yield: 0,
    };
    return recursiveGeohashSum(polygon, commonString, {stats:stuff.stats[crop], geohashPolygons:stuff.geohashPolygons}, availableGeohashes[crop], baseUrl+crop+'/geohash-length-index/', token)
    .then(function(newStuff) {
      stuff.stats[crop].area_sum = newStuff.stats.area_sum;
      stuff.stats[crop].weight_sum = newStuff.stats.weight_sum;
      stuff.stats[crop].count = newStuff.stats.count;
      stuff.stats[crop].mean_yield = newStuff.stats.weight_sum/newStuff.stats.area_sum;
      return stuff;
    })
  }).then(function() {
    return stuff;
  })
}

function recursiveGeohashSum(polygon, geohash, stuff, availableGeohashes, baseUrl, token) {
  return Promise.try(function() {
    //TODO: available geohashes could begin with e.g. geohash-3, but the greatest common prefix may only be a single character
    if (!availableGeohashes['geohash-'+geohash.length]) {
      return stuff;
    }
    if (!availableGeohashes['geohash-'+geohash.length][geohash]) {
      return stuff;
    }

    let ghBox = gh.decode_bbox(geohash);
    //create an array of vertices in the order [nw, ne, se, sw]
    let geohashPolygon = [
      [ghBox[1], ghBox[2]],
      [ghBox[3], ghBox[2]],
      [ghBox[3], ghBox[0]],
      [ghBox[1], ghBox[0]],
      [ghBox[1], ghBox[2]],
    ];
//1. If the polygon and geohash intersect, get a finer geohash.
    for (let i = 0; i < polygon.length-1; i++) {
      for (let j = 0; j < geohashPolygon.length-1; j++) {
        let lineA = {"type": "LineString", "coordinates": [polygon[i], polygon[i+1]]};
        let lineB = {"type": "LineString", "coordinates": [geohashPolygon[j], geohashPolygon[j+1]]};
        if (gju.lineStringsIntersect(lineA, lineB)) {
          //partially contained, dig into deeper geohashes
          //TODO: Once the lowest level is hit (geohash 7), 
          if (geohash.length === 7) {
            let url = baseUrl + 'geohash-7/geohash-index/' + geohash + '/geohash-data/';
            return cache.get(url, token).then(function(geohashes) {
              Object.keys(geohashes).forEach(function(g) {
                let ghBox = gh.decode_bbox(g);
                let pt = {"type":"Point","coordinates": [ghBox[1], ghBox[0]]};
                let poly = {"type":"Polygon","coordinates": [polygon]};
                if (gju.pointInPolygon(pt, poly)) {
                  stuff.stats.area_sum += geohashes[g].area.sum;
                  stuff.stats.weight_sum += geohashes[g].weight.sum;
                  stuff.stats.count += geohashes[g].count;
                }
              })
              return stuff;
            })
          } else {
            let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
            return Promise.map(geohashes, function(g) {
              return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, baseUrl, token)
              .then(function (newStuff) {
                if (newStuff === null) {
                  return stuff;
                }
                return newStuff;
              })
            }).then(() => {
              return stuff;
            })
          }
        } 
      }
    }
//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
    let pt = {"type":"Point","coordinates": geohashPolygon[0]};
    let poly = {"type":"Polygon","coordinates": [polygon]};
    if (gju.pointInPolygon(pt, poly)) {
      var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2) +'/geohash-data/'+geohash;
      return cache.get(url, token).then(function(data) {
        stuff.stats.area_sum += data.area.sum;
        stuff.stats.weight_sum += data.weight.sum;
        stuff.stats.count += data.count;
        stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
        return stuff;
      })
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1.
    pt = {"type":"Point","coordinates": polygon[0]};
    poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length === 7) {
        let url = baseUrl + 'geohash-7/geohash-index/' + geohash + '/geohash-data/';
        return cache.get(url, token).then(function(geohashes) {
          Object.keys(geohashes).forEach(function(g) {
            let ghBox = gh.decode_bbox(g);
            let pt = {"type":"Point","coordinates": [ghBox[1], ghBox[0]]};
            let poly = {"type":"Polygon","coordinates": [polygon]};
            if (gju.pointInPolygon(pt, poly)) {
              stuff.stats.area_sum += g.area.sum;
              stuff.stats.weight_sum += g.weight.sum;
              stuff.stats.count += g.stats.count;
              stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
            }
          })
          return stuff;
        })
      }
      let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
      return Promise.map(geohashes, function(g) {
        return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, baseUrl, token)
        .then(function (newStuff) {
          if (newStuff === null) {
            return stuff;
          }
          return newStuff;
        })
      }).then(() => {
        return stuff;
      })
    }
//4. The geohash and polygon are non-overlapping.
    return stuff;
  }).catch((error) => {
    console.log(error);
    return error
  })
}

//http://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
function longestCommonPrefix(strings) {
  let A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}
