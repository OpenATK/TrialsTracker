let gh = require('ngeohash');
import _ from 'lodash';
import {
	recursiveGeohashSearch,
	longestCommonPrefix 
} from '../src/modules/yield/utils/geohashesForPolygon.js';


it('longest common prefix should correct identify containing geohash', () => {
	expect(longestCommonPrefix(['abc123', 'abc122'])).toBe('abc12');
	expect(longestCommonPrefix(['dp69d45', 'dp69ef3', 'dp68'])).toBe('dp6');
})

it('the resulting set of geohashes should not overlap', () => {
	let noOverlaps = true;
	let bbox = {
		north: 40.98552706833876,
		south: 40.9841988299357,
		east: -86.18823766708374,
		west: -86.19293689727783,
	}
	let polygon = [
		[-86.18823766708374, 40.98551896940516],
		[-86.19110226631165, 40.98552706833876],
		[-86.1913275718689, 40.98535699052452],
		[-86.19170308113097, 40.985138318404545],
		[-86.19222879409789, 40.985178813296294],
		[-86.19241118431091, 40.98515451636424],
		[-86.19241118431091, 40.984895348531936],
		[-86.19245409965515, 40.98470097198927],
		[-86.19280815124512, 40.984514693931644],
		[-86.1928939819336, 40.98437700981173],
		[-86.19293689727783, 40.984182631741305],
		[-86.18823766708374, 40.9841988299357]
	]
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
	let commonString = longestCommonPrefix(strings);
	return recursiveGeohashSearch(polygon, commonString, []).then((geohashes) => {
		expect(geohashes.length > 0).toBe(true);
		expect(geohashes.length).toBe(_.uniq(geohashes).length);
		geohashes.forEach((g, i) => {
			geohashes.forEach((h, j) => {
				//no geohash should be a substring of another geohash
				if (g.length < h.length) expect(g).not.toBe(h.substring(0,g.length))
			})
		})
	})
})
	/*
it('given a geohash-7 as the input polygon, the ideal geohash should be one geohash', () => {
	let noOverlaps = true;
	let geo = 'dp69npt';
	let bbox = gh.decode_bbox(geo);
	let polygon = [
		[bbox[1], bbox[2]],
		[bbox[3], bbox[2]],
		[bbox[3], bbox[0]],
		[bbox[1], bbox[0]],
		[bbox[1], bbox[2]],
	]
  let strings = [gh.encode(bbox.north, bbox.west, 9),
    gh.encode(bbox.north, bbox.east, 9),
    gh.encode(bbox.south, bbox.east, 9),
    gh.encode(bbox.south, bbox.west, 9)];
	let commonString = longestCommonPrefix(strings);
	return recursiveGeohashSearch(polygon, commonString, []).then((geohashes) => {
		expect(geohashes.length).toBe(1);
		geohashes.forEach((g, i) => {
			geohashes.forEach((h, j) => {
				if (i !== j) {
					let boxOne = gh.decode_bbox(g);
					let boxTwo = gh.decode_bbox(h);
				  let poly = {"type":"Polygon","coordinates": [[
						[boxOne[1], boxOne[2]],
						[boxOne[3], boxOne[2]],
						[boxOne[3], boxOne[0]],
						[boxOne[1], boxOne[0]],
						[boxOne[1], boxOne[2]],
					]]}

					boxOne.forEach((p) => {
						let pt = {"type":"Point","coordinates": p};
						console.log(pt)
						expect(gju.pointInPolygon(pt, poly)).toBe(true)
					})
				}
			})
		})
	}).catch((err) => {
		console.log(err)
	})
})*/
