import gh from 'ngeohash';
import gju from 'geojson-utils';
import Promise from 'bluebird';

export function recursiveGeohashSearch(polygon, geohash, geohashes) {
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
		return polygonsIntersect(geohash, polygon, geohashPolygon, ghBox, geohashes).then(() => {
			console.log(geohashes)
			return geohashes
		})
	}).catch((err) => {
		console.log('UH OH', err)
		return geohashes
	}).then(() => {
		console.log('GOT BACK???')
		return geohashes
	})
}

//1. If the polygon and geohash intersect, get a finer geohash.
function polygonsIntersect(geohash, polygon, geohashPolygon, ghBox, geohashes) {
	let ret = false;
	return new Promise((resolve, reject) => {
		/*
		console.log('heyyyy', polygon, geohashPolygon)
		let poly = polygon.filter((thing, k) => k < polygon.length-1);
		let ghPoly = geohashPolygon.filter((thing, l) => l < geohashPolygon.length-1);
		return Promise.map(poly, (coord, i) => {
			return Promise.map(ghPoly, (ghCoord, j) => {
				console.log(i, j)
				let lineA = {"type": "LineString", "coordinates": [coord, polygon[i+1]]};
				let lineB = {"type": "LineString", "coordinates": [ghCoord, geohashPolygon[j+1]]};
				if (gju.lineStringsIntersect(lineA, lineB)) {
					console.log('ANYTHING?!!?!?!?!?!?')
					ret = true;
					if (geohash.length === 9) return geohashes; // Can't go any deeper, omit.
					let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
					// fix precision errors. geohashes should start with the given geohash
					gs = gs.filter((item) => item.substring(0, geohash.length) === geohash);
					return resolve(Promise.map(gs, (g) => {
						return recursiveGeohashSearch(polygon, g, geohashes)
					}).then(() => {
						console.log('IN HERE', geohashes)
						return geohashes;
					}))
				}
				return
			})
		}).then(() => { return resolve()})
		*/
		for (let i = 0; i < polygon.length-1; i++) {
      for (let j = 0; j < geohashPolygon.length-1; j++) {
        let lineA = {"type": "LineString", "coordinates": [polygon[i], polygon[i+1]]};
        let lineB = {"type": "LineString", "coordinates": [geohashPolygon[j], geohashPolygon[j+1]]};
        if (gju.lineStringsIntersect(lineA, lineB)) {
					if (geohash.length === 9) return geohashes; // Can't go any deeper, omit.
					let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
					// fix precision errors. geohashes should start with the given geohash
					gs = gs.filter((item) => item.substring(0, geohash.length) === geohash);
					return resolve(Promise.map(gs, (g) => {
						return recursiveGeohashSearch(polygon, g, geohashes).then((results) => {
							if (results === null) return geohashes;
							return results
						})
					}).then(() => {
						return geohashes;
					}))
				}
      }
		}
		return resolve();
	}).then(() => {
		if (!ret) return geohashInsidePolygon(geohash, polygon, geohashPolygon, ghBox, geohashes)
		return geohashes
	})
}

//2. If geohash is completely inside polygon, use the stats. Only one point
//   need be tested because no lines intersect in Step 1.
function geohashInsidePolygon(geohash, polygon, geohashPolygon, ghBox, geohashes) {
	let ret = false;
	return new Promise((resolve, reject) => {
		let pt = {"type":"Point","coordinates": geohashPolygon[0]};
		let poly = {"type":"Polygon","coordinates": [polygon]};
		if (gju.pointInPolygon(pt, poly)) {
			ret = true;
			geohashes[geohash.slice(0, geohash.length-2)] = geohashes[geohash.slice(0,geohash.length-2)] || {};
			geohashes[geohash.slice(0, geohash.length-2)][geohash] = geohash;
			return resolve(geohashes);
		}
		return resolve()
	}).then(() => {
		if (!ret) return polygonInGeohash(geohash, polygon, geohashPolygon, ghBox, geohashes)
		return geohashes
	})
}

//3. If polygon is completely inside geohash, dig deeper. Only one point need 
//   be tested because no lines intersect in Step 1 and geohash isn't contained 
//   by the polygon in step 2. 
function polygonInGeohash(geohash, polygon, geohashPolygon, ghBox, geohashes) {
	return new Promise((resolve, reject) => {
		let pt = {"type":"Point","coordinates": polygon[0]};
		let poly = {"type":"Polygon","coordinates": [geohashPolygon]};
		if (gju.pointInPolygon(pt, poly)) {
			if (geohash.length === 9) return geohashes;
			let gs = gh.bboxes(ghBox[0], ghBox[1], ghBox[2], ghBox[3], geohash.length+1);
			gs = gs.filter((item) => item.substring(0, geohash.length) === geohash);
			return resolve(Promise.map(gs || [], (g) => {
				return recursiveGeohashSearch(polygon, g, geohashes)
			}).then(() => {
				return geohashes;
			}))
		}
		return resolve()
	}).then(() => {
		//4. The geohash and polygon are non-overlapping.
		return geohashes
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
