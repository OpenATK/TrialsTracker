import gh from 'ngeohash';
import gju from 'geojson-utils';
import _ from 'lodash'
import Promise from 'bluebird';
import geohashNoteIndexManager from './geohashNoteIndexManager';

export default function yieldDataStatsForPolygon(polygon, bbox) {
  if (polygon.length < 1 || !bbox.north) return Promise.resolve([]);
  let newPoly = _.clone(polygon);
  newPoly.push(polygon[0])
  //Get the four corners, convert to geohashes, and find the smallest common geohash of the bounding box
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
	let commonString = longestCommonPrefix(strings);
	return recursiveGeohashSearch(newPoly, commonString, []).then((geohashes) => {
    return geohashes
  })
}

function recursiveGeohashSearch(polygon, geohash, geohashes) {
	return Promise.try(() => {
    //TODO: available geohashes could begin with e.g. geohash-3, but the greatest common prefix may only be a single character
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
					if (geohash.length === 9) return geohashes; // Can't go any deeper, omit.
					let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
					return Promise.map(gs, (g) => {
						return recursiveGeohashSearch(polygon, g, geohashes).then((results) => {
							if (results === null) return geohashes;
							return results
						})
					}).then(() => {
						return geohashes;
					})
				}
      }
    }
//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
    let pt = {"type":"Point","coordinates": geohashPolygon[0]};
    let poly = {"type":"Polygon","coordinates": [polygon]};
		if (gju.pointInPolygon(pt, poly)) {
			geohashes.push(geohash)
      return geohashes;
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1 and geohash
//   isn't contained by the polygon in step 2. 
    pt = {"type":"Point","coordinates": polygon[0]};
		poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length === 9) return geohashes;
      let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
			return Promise.map(gs || [], (g) => {
        return recursiveGeohashSearch(polygon, g, geohashes).then((results) => {
          if (results === null) return geohashes;
          return results;
        })
      }).then(() => {
        return geohashes;
      })
    }
//4. The geohash and polygon are non-overlapping.
		return geohashes;
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

	/*
function doStuff({}) {
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

	if (!availableGeohashes['geohash-'+geohash.length]) {
    return stuff;
  }
  if (!availableGeohashes['geohash-'+geohash.length][geohash]) {
    return stuff;
	}

	let baseUrl = '/harvest/tiled-maps/dry-yield-map/crop-index/'+crop+'/geohash-length-index/';
	let url = baseUrl+'geohash-6/geohash-index/' + geohash.substring(0, 6);
	return cache.get(domain, token, url).then((res) => {
	})
}
*/
