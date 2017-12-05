import cache from '../../Cache';
import gh from 'ngeohash';
import gju from 'geojson-utils';
import _ from 'lodash'
import Promise from 'bluebird';

export default function yieldDataStatsForPolygon(polygon, bbox, availableGeohashes, baseUrl, token) {
  let newPoly = _.clone(polygon);
  newPoly.push(polygon[0])
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
  let commonString = longestCommonPrefix(strings);
	let stuff = {
	  stats: {},
	  geohashPolygons: []
	};
  return Promise.each(Object.keys(availableGeohashes), (crop) => {
    stuff.stats[crop] = { 
      area_sum: 0,
      weight_sum: 0,
      count: 0,
      mean_yield: 0,
    };
    return recursiveGeohashSum(newPoly, commonString, {stats:stuff.stats[crop], geohashPolygons:stuff.geohashPolygons}, availableGeohashes[crop], baseUrl+crop+'/geohash-length-index/', token)
    .then((newStuff) => {
      stuff.stats[crop].area_sum = newStuff.stats.area_sum;
      stuff.stats[crop].weight_sum = newStuff.stats.weight_sum;
      stuff.stats[crop].count = newStuff.stats.count;
			stuff.stats[crop].mean_yield = newStuff.stats.weight_sum/newStuff.stats.area_sum;
      if (stuff.stats[crop].count === 0) delete stuff.stats[crop]
      return true;
    })
  }).then(() => {
    return stuff;
  })
}

function recursiveGeohashSum(polygon, geohash, stuff, availableGeohashes, baseUrl, token) {
  return Promise.try(() => {
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
          if (geohash.length === 7) { // the aggregates themselves are the only option
            // Get the geohash 8s via geohash 6 bucket.  Then 
            let url = baseUrl + 'geohash-6/geohash-index/' + geohash.substring(0, 6) + '/geohash-data/';
            return cache.get(url, token).then((geohashes) => {
              geohashes = _.pickBy(geohashes, function(value, key) {
                return key.substring(0, geohash.length) === geohash;
              });
              return Promise.map(Object.keys(geohashes), (g) => {
                return recursiveAggregateStats(polygon, g, stuff, geohashes, baseUrl, token)
                .then((newStuff) => {
                  if (newStuff.stats === null) return stuff;
                  return newStuff;
                })
              }, { concurrency: 1 })
            })
          }
// Get deeper geohash bucket
          let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
          return Promise.map(geohashes, (g) => {
            return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, baseUrl, token)
            .then((newStuff) => {
              if (newStuff.stats === null) return stuff;
              return newStuff;
            })
          }, { concurrency: 1 }).then(() => {
            return stuff;
          })
        } 
      }
    }
//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
    let pt = {"type":"Point","coordinates": geohashPolygon[0]};
    let poly = {"type":"Polygon","coordinates": [polygon]};
		if (gju.pointInPolygon(pt, poly)) {
			var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2) +'/geohash-data/'+geohash;
      return cache.get(url, token).then((data) => {
        stuff.stats.area_sum += data.area.sum;
        stuff.stats.weight_sum += data.weight.sum;
        stuff.stats.count += data.count;
        stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
        return stuff;
      })
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1 and geohash
//   isn't contained by the polygon in step 2. 
    pt = {"type":"Point","coordinates": polygon[0]};
    poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length === 7) { // Finest size bucket, get geohashes in this bucket and see if they're in or out
        let url = baseUrl + 'geohash-6/geohash-index/' + geohash.substring(0, 6) + '/geohash-data/';
        return cache.get(url, token).then((geohashes) => {
          geohashes = _.pickBy(geohashes, function(value, key) {
            return key.substring(0, geohash.length) === geohash;
          });
          return Promise.map(Object.keys(geohashes), (g) => {
            return recursiveAggregateStats(polygon, g, stuff, geohashes, baseUrl, token)
            .then((newStuff) => {
              if (newStuff.stats === null) {
                return stuff;
              }
              return newStuff;
            })
          }, { concurrency: 1 })
        })
      }
      let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
      return Promise.map(geohashes, (g) => {
        return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, baseUrl, token)
        .then((newStuff) => {
          if (newStuff.stats === null) {
            return stuff;
          }
          return newStuff;
        })
      }, { concurrency: 1 }).then(() => {
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

// 1. get all of the geohash-8s aggregates from the geohash-6
// 2. get and loop over the the 32 geohash-8s based on the geohash-7
// 3. if the geohash isn't contained by the polygon, get the available geohash-9s and loop over the 32 geohash-9s
// 4. Get all of the geohash-9s 

function recursiveAggregateStats(polygon, geohash, stuff, availableGeohashes, baseUrl, token) {
  return Promise.try(() => {
    if (!availableGeohashes[geohash]) {
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
          if (geohash.length === 9) return stuff
            // smallest possible geohash not completely contained; omit it
          let url = baseUrl + 'geohash-'+(geohash.length-1)+'/geohash-index/' + geohash.substring(0, geohash.length-1) + '/geohash-data/';
          return cache.get(url, token).then((geohashes) => {
            geohashes = _.pickBy(geohashes, function(value, key) {
              return key.substring(0, geohash.length) === geohash;
            });
            return Promise.map(Object.keys(geohashes), (g) => {
              return recursiveAggregateStats(polygon, g, stuff, geohashes, baseUrl, token) 
              .then((newStuff) => {
                if (newStuff.stats === null) return stuff;
                return newStuff;
              })
            }, { concurrency: 1 }).then(() => {
              return stuff;
            })
          })
        }
      }
    }
//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
    let pt = {"type":"Point","coordinates": geohashPolygon[0]};
    let poly = {"type":"Polygon","coordinates": [polygon]};
    if (gju.pointInPolygon(pt, poly)) {
      var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2) +'/geohash-data/'+geohash;
      return cache.get(url, token).then((data) => {
        stuff.stats.area_sum += data.area.sum;
        stuff.stats.weight_sum += data.weight.sum;
        stuff.stats.count += data.count;
        stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
        return stuff;
      })
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1 and geohash
//   isn't contained by the polygon in step 2. 
    pt = {"type":"Point","coordinates": polygon[0]};
    poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length === 9) return stuff;
        // smallest possible geohash not completely contained; omit it
      let url = baseUrl + 'geohash-'+(geohash.length-1)+'/geohash-index/' + geohash.substring(0, geohash.length-1) + '/geohash-data/';
      return cache.get(url, token).then((geohashes) => {
        geohashes = _.pickBy(geohashes, function(value, key) {
          return key.substring(0, geohash.length) === geohash;
        });
        return Promise.map(Object.keys(geohashes), (g) => {
          return recursiveAggregateStats(polygon, g, stuff, geohashes, baseUrl, token) 
          .then((newStuff) => {
            if (newStuff.stats === null) return stuff;
            return newStuff;
          })
        }, { concurrency: 1 }).then(() => {
          return stuff;
        })
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
