import gju from 'geojson-utils';

export default function polygonContainsPolygon(polyOut, polyIn) {
  for (var i = 0; i < polyOut.length-1; i++) {
    var lineA = {"type": "LineString", "coordinates": [polyOut[i], polyOut[i+1]]};
    for (var j = 0; j < polyIn.length-1; j++) {
      var lineB = {"type": "LineString", "coordinates": [polyIn[j], polyIn[j+1]]};
      if (gju.lineStringsIntersect(lineA, lineB)) return false;
    }
  }
  var pt = {"type":"Point","coordinates": polyIn[0]};
  var poly = {"type":"Polygon","coordinates": [polyOut]};
  if (gju.pointInPolygon(pt, poly)) return true;
  return false;
}


