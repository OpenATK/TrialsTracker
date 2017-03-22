export default function computeBoundingBox(geojsonPolygon) {
  var bbox;
  var coords = geojsonPolygon.coordinates[0];
  var north = coords[0][1];
  var south = coords[0][1];
  var east = coords[0][0];
  var west = coords[0][0];
  for (var j = 0; j < coords.length; j++) {
    if (coords[j][1] > north) north = coords[j][1];
    if (coords[j][1] < south) south = coords[j][1];
    if (coords[j][0] > east) east = coords[j][0];
    if (coords[j][0] < west) west = coords[j][0];
  }
  var bbox = {north, south, east, west};

  return bbox;
};
