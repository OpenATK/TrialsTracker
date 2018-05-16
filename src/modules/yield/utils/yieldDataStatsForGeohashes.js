import gh from 'ngeohash';
import gju from 'geojson-utils';
import _ from 'lodash'
import Promise from 'bluebird';
import geohashNoteIndexManager from './geohashNoteIndexManager';

export default function yieldDataStatsForPolygon(polygon, bbox, availableGeohashes, domain, token) {
  let newPoly = _.clone(polygon);
  newPoly.push(polygon[0])
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
  let commonString = longestCommonPrefix(strings);
	let stuff = {
	  geohashPolygons: []
	};
  return Promise.map(Object.keys(availableGeohashes || {}), (crop) => {
    stuff.stats[crop] = { 
			area: {
				sum: 0,
				sum_of_squares: 0,
			},
			weight: {
				sum: 0,
				sum_of_squares: 0,
			},
      count: 0,
			yield: { mean: 0, variance: 0, standardDeviation: 0},
			'sum-yield-squared-area': 0,
		};
		return recursiveGeohashSearch(newPoly, commonString, {stats:stuff.stats[crop], geohashPolygons:stuff.geohashPolygons}, availableGeohashes[crop], domain, '/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/', token).then((results) => {
      stuff.stats[crop].area.sum = results.stats.area.sum;
      stuff.stats[crop].area.sum_of_squares = results.stats.area.sum_of_squares;
      stuff.stats[crop].weight.sum = results.stats.weight.sum;
      stuff.stats[crop].weight.sum_of_squares = results.stats.weight.sum_of_squares;
      stuff.stats[crop].count = results.stats.count;
		  stuff.stats[crop].yield = {}
			stuff.stats[crop].yield.mean = results.stats.weight.sum/results.stats.area.sum;
			stuff.stats[crop].yield.variance = (results.stats['sum-yield-squared-area']/results.stats.area.sum) - Math.pow(stuff.stats[crop].yield.mean, 2);
			stuff.stats[crop].yield.standardDeviation = Math.pow(stuff.stats[crop].yield.variance,  0.5);
			stuff.stats[crop]['sum-yield-squared-area'] = results.stats['sum-yield-squared-area'];
      if (stuff.stats[crop].count === 0) delete stuff.stats[crop]
      return true;
    })
  }).then(() => {
    return stuff;
  })
}

function recursiveGeohashSum(polygon, geohash, stuff, availableGeohashes, domain, baseUrl, token) {
	//return Promise.resolve(() => {
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
            let url = baseUrl+'geohash-6/geohash-index/' + geohash.substring(0, 6);
            return cache.get(domain, token, url).then((res) => {
              let geohashes = _.pickBy(res['geohash-data'], function(value, key) {
                return key.substring(0, geohash.length) === geohash;
              });
              return Promise.map(Object.keys(geohashes || {}), (g) => {
                return recursiveAggregateStats(polygon, g, stuff, geohashes, domain, baseUrl, token).then((results) => {
                  if (results.stats === null) return stuff;
                  return results;
                })
              })
            })
          }
// Get deeper geohash bucket
          let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
          return Promise.map(geohashes, (g) => {
            return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, domain, baseUrl, token).then((results) => {
              if (results.stats === null) return stuff;
              return results;
            })
          }).then(() => {
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
			var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2);
			return cache.get(domain, token, url).then((res) => {
				let data = res['geohash-data'][geohash];
				if (data) {
					stuff.stats.area.sum += data.area.sum;
					stuff.stats.area.sum_of_squares += data.area['sum-of-squares'];
					stuff.stats.weight.sum += data.weight.sum;
					stuff.stats.weight.sum_of_squares += data.weight['sum-of-squares'];
					stuff.stats.count += data.count;
					stuff.stats['sum-yield-squared-area'] += data['sum-yield-squared-area'];
					stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
				}
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
				let url = baseUrl + 'geohash-6/geohash-index/' + geohash.substring(0, 6);
        return cache.get(domain, token, url).then((res) => {
          let geohashes = _.pickBy(res['geohash-data'], function(value, key) {
            return key.substring(0, geohash.length) === geohash;
          });
					return Promise.map(Object.keys(geohashes || {}), (g) => {
            return recursiveAggregateStats(polygon, g, stuff, geohashes, domain, baseUrl, token).then((results) => {
              if (results.stats === null) return stuff;
              return results;
            })
          })
        })
      }
      let geohashes = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
			return Promise.map(geohashes || [], (g) => {
        return recursiveGeohashSum(polygon, g, stuff, availableGeohashes, domain, baseUrl, token).then((results) => {
          if (results.stats === null) return stuff;
          return results;
        })
      }).then(() => {
        return stuff;
      })
    }
//4. The geohash and polygon are non-overlapping.
		return stuff;
  })
}

// 1. get all of the geohash-8s aggregates from the geohash-6
// 2. get and loop over the the 32 geohash-8s based on the geohash-7
// 3. if the geohash isn't contained by the polygon, get the available geohash-9s and loop over the 32 geohash-9s
// 4. Get all of the geohash-9s 

function recursiveAggregateStats(polygon, geohash, stuff, availableGeohashes, domain, baseUrl, token) {
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
					let url = baseUrl + 'geohash-'+(geohash.length-1)+'/geohash-index/' + geohash.substring(0, geohash.length-1);
          return cache.get(domain, token, url).then((res) => {
            let geohashes = _.pickBy(res['geohash-data'], function(value, key) {
              return key.substring(0, geohash.length) === geohash;
            });
            return Promise.map(Object.keys(geohashes || {}), (g) => {
              return recursiveAggregateStats(polygon, g, stuff, geohashes, domain, baseUrl, token).then((results) => {
                if (results.stats === null) return stuff;
                return results;
              })
            }).then(() => {
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
      var url = baseUrl + 'geohash-' + (geohash.length-2) + '/geohash-index/'+ geohash.substring(0, geohash.length-2);
			return cache.get(domain, token, url).then((res) => {
				let data = res['geohash-data'][geohash];
				if (data) {
					stuff.stats.area.sum += data.area.sum;
					stuff.stats.area.sum_of_squares += data.area.sum_of_squares;
					stuff.stats.weight.sum += data.weight.sum;
					stuff.stats.weight.sum_of_squares += data.weight.sum_of_squares;
					stuff.stats.count += data.count;
					stuff.stats['sum-yield-squared-area'] += data['sum-yield-squared-area'];
					stuff.geohashPolygons.push({"type":"Polygon","coordinates": [geohashPolygon]})
				}
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
      let url = baseUrl + 'geohash-'+(geohash.length-1)+'/geohash-index/' + geohash.substring(0, geohash.length-1);
      return cache.get(domain, token, url).then((res) => {
        let geohashes = _.pickBy(res['geohash-data'], function(value, key) {
          return key.substring(0, geohash.length) === geohash;
        });
        return Promise.map(Object.keys(geohashes || {}), (g) => {
          return recursiveAggregateStats(polygon, g, stuff, geohashes, domain, baseUrl, token).then((results) => {
            if (results.stats === null) return stuff;
            return results;
          })
        }).then(() => {
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
