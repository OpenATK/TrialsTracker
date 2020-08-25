import gju from 'geojson-utils';

export default function polygonsIntersect(polyOut, polyIn) {
  for (let i = 0; i < polyOut.length-1; i++) {
    for (let j = 0; j < polyIn.length-1; j++) {
      if (gju.lineStringsIntersect(
        {
          "type": "LineString", 
          "coordinates": [polyOut[i], polyOut[i+1]]
        }, {
          "type": "LineString", 
          "coordinates": [polyIn[j], polyIn[j+1]]
        })
      ) return true;
    }
  }
  let pt = {"type":"Point","coordinates": polyIn[0]};
  let poly = {"type":"Polygon","coordinates": [polyOut]};
  if (gju.pointInPolygon(pt, poly)) return true;
  pt = {"type":"Point","coordinates": polyOut[0]};
  poly = {"type":"Polygon","coordinates": [polyIn]};
  if (gju.pointInPolygon(pt, poly)) return true;
  return false;
}
