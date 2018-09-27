const tiles = {};
const index = {};

function set(crop, coordsIndex, value, inval) { 
  var z = coordsIndex.split('-')[0];
  tiles[crop] = tiles[crop] || {};
  tiles[crop][z] = tiles[crop][z] || {};
  tiles[crop][z][coordsIndex] = value;
  if (inval) invalidate(crop, coordsIndex)
  //setLookup(crop, geohashes, coordsIndex);
  return
}

function get(crop, coordsIndex) {
  var z = coordsIndex.split('-')[0];
  if (tiles[crop] && tiles[crop][z]) return tiles[crop][z][coordsIndex];
  return
}

function remove(crop, coordsIndex) { 
  var z = coordsIndex.split('-')[0];
  return delete tiles[crop][z][coordsIndex]
}

// This lookup is used in two cases: 1) a geohash push notification is received,
// and we need to figure out which tiles to re-render. 2) As a geohash push
// notification is received, we need to invalidate all other tiles affected by
// that are affected.
function setLookup(crop, geohashes, coordsIndex) {
  index[crop] = index[crop] || {};
  geohashes = geohashes || [];
  return geohashes.map((geohash) => {
    index[crop][geohash] = index[crop][geohash] || {};
    index[crop][geohash][coordsIndex] = true;
  })
}

function lookup(crop, geohash) {
  return index[crop][geohash]
}

function invalidate(crop, coordsIndex) {
  var pieces = coordsIndex.split('-')
  var coords = {
    x: pieces[1],
    y: pieces[2],
    z: pieces[0]
  }
  Object.keys(index[crop] || {}).map((z) => {
    // SKIP THE TILE AT THE CURRENT ZOOM LEVEL z == coords.z. We're
    // working on it now!
    if (z < coords.z) {
      // Only one parent exists for parent tiles
      var x = Math.floor(coords.x/Math.pow(2, coords.z-z));
      var y = Math.floor(coords.y/Math.pow(2, coords.z-z));
      var tileIndex = z.toString()+'-'+x.toString()+'-'+y.toString();
      if (index[crop][z][tileIndex]) delete index[crop][z][tileIndex];
    } else {
      var xRange = Math.pow(2, z-coords.z)
      var startX = coords.x*xRange;
      for (var x = startX; x < startX+xRange; x++) {
        var yRange = Math.pow(2, z-coords.z)
        var startY = coords.y*yRange;
        for (var y = startY; y < startY+yRange; y++) {
          console.log('invalidating', coordsIndex, z, x, y)
          var tileIndex = z.toString()+'-'+x.toString()+'-'+y.toString();
          if (index[crop][z][tileIndex]) delete index[crop][z][tileIndex];
        }
      }
    }
  })
}

const tileManager = {
  set,
  get,
  remove,
  setLookup,
  lookup
}



Object.freeze(tileManager);
export default tileManager;
