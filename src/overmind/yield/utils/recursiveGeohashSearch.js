import gh from 'ngeohash';
import gju from 'geojson-utils';
import Promise from 'bluebird';

export function recursiveGeohashSearch(polygon, geohash, geohashes, max) {
  return Promise.try(() => {
    let maxLength = max || 9;
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
					if (geohash.length === maxLength) return geohashes; // Can't go any deeper, omit.
					let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
					// fix precision errors. geohashes should start with the given geohash
					gs = gs.filter((item) => item.substring(0, geohash.length) === geohash);
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
//2. If geohash is completely inside polygon, use it. Only one point
//   need be tested because no lines intersect in Step 1.
    let pt = {"type":"Point","coordinates": geohashPolygon[0]};
    let poly = {"type":"Polygon","coordinates": [polygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length > 7) {
        geohashes[geohash.slice(0, geohash.length-2)] = geohashes[geohash.slice(0,geohash.length-2)] || {};
        geohashes[geohash.slice(0, geohash.length-2)][geohash] = true;
      } else {
        geohashes[geohash] = true;
      }
      return geohashes;
    }
//3. If polygon is completely inside geohash, dig deeper. Only one point
//   need be tested because no lines intersect in Step 1 and geohash
//   isn't contained by the polygon in step 2. 
    pt = {"type":"Point","coordinates": polygon[0]};
		poly = {"type":"Polygon","coordinates": [geohashPolygon]};
    if (gju.pointInPolygon(pt, poly)) {
      if (geohash.length === maxLength) return geohashes;
      let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
			gs = gs.filter((item) => item.substring(0, geohash.length) === geohash);
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
export function longestCommonPrefix(strings) {
  let A = strings.concat().sort(), 
  a1= A[0], 
  a2= A[A.length-1], 
  L= a1.length, 
  i= 0;
  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}
