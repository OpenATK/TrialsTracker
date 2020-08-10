// This web worker takes:
// 1. The set of new geohashes that need to be rendered,
// 2. The tile coordinates
// 3. The cache retaining the geohash data so that it can be fetched
// 4. The legend to map geohash data to pixel colors

// This thing should:
// 1. Determine whether any new/updated geohashes are inside of this tile.
// 2. 
module.exports = { blendColors, decode_bbox, drawOnCanvas, colorForvalue };

// This function recursively draws yield data points //TODO: determine best performance here!
function drawOnCanvas(data) {
  var coords = data.coords;
  var data = data.data;
  var imageData = data.imageData;
  var legend = data.legend;
  console.log('drawOnCanvas');
  var keys = Object.keys(data);
  console.log(keys)
  var self = this;
  for (var i = 0; i < keys.length; i++) {
    for (var j = 0; j < keys.length; j++) {
    var val = data[keys[i]];
    var ghBounds = decode_bbox(keys[i]); 
    var swLatLng = new L.latLng(ghBounds[0], ghBounds[1]);
    var neLatLng = new L.latLng(ghBounds[2], ghBounds[3]);
    var levels = self.props.legend;
    var sw = self.props.map.project(swLatLng, coords.z);
    var ne = self.props.map.project(neLatLng, coords.z);
    var w = sw.x - coords.x*256;
    var n = ne.y - coords.y*256;
    var e = ne.x - coords.x*256;
    var s = sw.y - coords.y*256;
    var width = Math.ceil(e-w);
    var height = Math.ceil(s-n);
    var col = self.colorForvalue(val.weight.sum/val.area.sum, levels);

    //Fill the entire geohash aggregate with the appropriate color
    //var context = canvas.getContext('2d');
    //context.lineWidth = 0;
    //context.beginPath();
    //context.rect(w, n, width, height);
    //context.fillStyle = Color(col).hexString();
    //context.fill();
    }
  }
/*
  if (stopIndex != keys.length) {
    return self.recursiveDrawOnCanvas(coords, legend, projectFunc, canvas, data, stopIndex);
  } 
*/
  return imageData;
}
 
 
