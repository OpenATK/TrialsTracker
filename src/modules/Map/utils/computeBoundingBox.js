export default function computeBoundingBox(geojsonPolygon) {
  let bbox;
  let coords = geojsonPolygon.coordinates[0];
  let north = coords[0][1];
  let south = coords[0][1];
  let east = coords[0][0];
  let west = coords[0][0];
  for (let j = 0; j < coords.length; j++) {
    if (coords[j][1] > north) north = coords[j][1];
    if (coords[j][1] < south) south = coords[j][1];
    if (coords[j][0] > east) east = coords[j][0];
    if (coords[j][0] < west) west = coords[j][0];
  }
  bbox = {north, south, east, west};

  return bbox;
};
