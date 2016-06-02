exports.geotiff2json = function(filename) {
  //var gdal = require('gdal');
  //var fs = require("fs");
  var dataset = gdal.open(filename);
  var GT = dataset.geoTransform;
  var band = dataset.bands.get(1);
  var pixels = band.pixels;
/*
  var CT = new gdal.CoordinateTransformation(dataset.srs, gdal.SpatialReference.fromEPSG(3857));
  var gtifDriver = gdal.drivers.get(1);
  var ds = gtifDriver.create(file);
  gdal.reprojectImage({
    src: dataset,
    dst: ds, 
    s_srs: dataset.srs, 
    t_srs: gdal.SpatialReference.fromEPSG(3857)
  });
*/
  var json = {
    type: "RasterDataset",
    geotransform: GT,
    data: []
  };
/*
  json.geotransform[0] = UL.x;
  json.geotransform[3] = UL.y;
  json.geotransform[1] = cellsize.x;
  json.geotransform[5] = cellsize.y;
  console.log(json);
*/
  for (var i = 0; i < band.size.x; i++) {
    json.data.push(new Array(band.size.y));
    for (var j = 0; j < band.size.y; j++) {
      json.data[i][j] = pixels.get(i,j);
    }
  }
  var outFileName = filename.slice(0,-4)+'.json'; 
  fs.writeFile(outFileName, JSON.stringify(json), (err) => {
     if (err) throw err;
    console.log('Generated file ' + outFileName + ' from ' + filename);
  });
  return json;
};

exports.makeGeoJsonPolygons = function(json, filename) {
  //var fs = require('fs');
  console.log("making polygons");
  var geojson = {
    type: "FeatureCollection",
    features: []
  };
  for (var i = 0; i < json.data.length; i++) {
    for (var j = 0; j < json.data[0].length; j++) {
      //An affine transform which maps pixel/line coordinates into georeferenced space using the following relationship
      //var Xgeo = GT[0] + i*GT[1] + 0*GT[2];
      //var Ygeo = GT[3] + j*GT[5] + 0*GT[4];
      var UL = {x: (json.geotransform[0] + i*json.geotransform[1])-(json.geotransform[1]*0.5), y: (json.geotransform[3] + j*json.geotransform[5])+(json.geotransform[1]*0.5)}; 
      var UR = {x: (json.geotransform[0] + i*json.geotransform[1])+(json.geotransform[1]*0.5), y: (json.geotransform[3] + j*json.geotransform[5])+(json.geotransform[1]*0.5)}; 
      var LL = {x: (json.geotransform[0] + i*json.geotransform[1])-(json.geotransform[1]*0.5), y: (json.geotransform[3] + j*json.geotransform[5])-(json.geotransform[1]*0.5)}; 
      var LR = {x: (json.geotransform[0] + i*json.geotransform[1])+(json.geotransform[1]*0.5), y: (json.geotransform[3] + j*json.geotransform[5])-(json.geotransform[1]*0.5)};

      geojson.features.push({ 
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[[UL.x, UL.y], [UR.x, UR.y], [LR.x, LR.y], [LL.x, LL.y], [UL.x, UL.y]]]
        },
        properties: {
          value: json.data[i][j],
        },
/*
        crs: {
          type: "link",
          properties: {
            href: "http://spatialreference.org/ref/sr-org/7483/esriwkt/",
            type: "esriwkt"
          }
        }
*/
      });
    }
  }
  var outFileName = filename.slice(0,-4)+'.geojson'; 
  fs.writeFile(outFileName, JSON.stringify(geojson), (err) => {
     if (err) throw err;
    console.log('Generated file ' + outFileName + ' from ' + filename);
  });
  return geojson;
};
/*
crs: {
          type: "link",
          properties: {
            href: "http://spatialreference.org/ref/sr-org/7483/esriwkt/",
            type: "esriwkt"
          }
        }
*/

exports.makeGeoJsonPoints = function(json) {
  console.log('making points');
  var geojson = {
    type: "FeatureCollection",
    features: []
  };

  for (var i = 0; i < json.xSize; i++) {
    for (var j = 0; j < json.ySize; j++) {
      //An affine transform which maps pixel/line coordinates into georeferenced space using the following relationship
      var Xgeo = json.geotransform[0] + i*json.geotransform[1] + 0*json.geotransform[2];
      var Ygeo = json.geotransform[3] + j*json.geotransform[5] + 0*json.geotransform[4];
      geojson.features.push({ 
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Xgeo, Ygeo]
        },
        properties: {
          value: json.data[i][j],
        },
      });
    }
  }
  return geojson;
};
/*
generateBins = function(stats, numBins) {
  var bins = []; 
  var binInterval = (stats.max - stats.min)/numBins;
  for (var i = 0; i <= numBins; i++) {
    bins.push(stats.min + (binInterval*i));
  }
  return bins;
};
*/
//exports.quantize = function(data, level) {
exports.quantize = function(outDataset, inBand, bins) {
  var pix = inBand.pixels;
  for (var i = 0; i < inBand.size.x; i++) {
    for (var j = 0; j < inBand.size.y; j++) {
      if (pix.get(i, j) == -9999) continue;
      var val = Math.floor((pix.get(i,j) - bins[0]) / ((bins[bins.length-1]-bins[0])/bins.length));
      outDataset.bands.get(1).pixels.set(i,j,val);
//      for (var k = 0; k < bins.length-1; k++) { 
//        if (pix.get(i,j) > bins[k] & pix.get(i,j) <= bins[k+1]) {
//          outDataset.bands.get(1).pixels.set(i,j,k);
//        }
//      }
    }
  }
  return outDataset;
};

exports.polygonize = function(filename, numBins) {
  //var fs = require('fs');
  //var gdal = require('gdal');

  var dataset = gdal.open(filename);
  var band = dataset.bands.get(1);
  var stats = band.getStatistics(false, true);
  var bins = generateBins(stats, numBins);
  // can't create new band on existing geotiff, so create a new geotiff
  var newRaster = gdal.drivers.get('GTiff').create('newRaster.tif', band.size.x, band.size.y, 1, gdal.GDT_Int32);
  //set pixel values using original data quantized into bins
  newRaster = exports.quantize(newRaster, band, bins);

  //create the geojson dataset to which the polygonized data will be written
//  var driver = gdal.drivers.get('GeoJSON');
  var driver = gdal.drivers.get('ESRI Shapefile');
  var geojsonData = driver.create('output.shp', dataset.srs);
  var srs = gdal.SpatialReference.fromEPSG(4326);
  var outLayer = geojsonData.layers.create('new', srs, gdal.wkbMultiPolygon, {});
  var def = new gdal.FieldDefn('value', gdal.OFTInteger);
  outLayer.fields.add(def); 
  gdal.polygonize({
    src: newRaster.bands.get(1),
    dst: outLayer, 
    pixValField: 0,
  }); 
  geojsonData.layers.get(0).features.forEach(function(feature, i) {
   console.log(feature.getGeometry()); 
  });
  console.log(geojsonData.layers.get(0).features.count());
  console.log(geojsonData.layers.get(0));
};

exports.buildImage = function(json) {
  //var lwip = require('lwip');
  var legend = {
    levels: [{
      value: json.min,
      color: {
        r: 255,
        g: 0,
        b: 0,
        a: 100
      }
    }, {
      value: json.max,
      color: {
        r: 0,
        g: 255,
        b: 0,
        a: 100
      }
    }]
  };
  var width = json.data.length;
  var height = json.data[0].length;
  var color = {r: 255, g: 255, b:255, a: 100};
  var trans = color.a < 100,
    c_len = width * height,
    pixelsBuf = new Buffer(c_len * 4);
  for (var i = 0; i < width * height; i++) {
    pixelsBuf[i] = color.r;
    pixelsBuf[c_len + i] = color.g;
    pixelsBuf[2 * c_len + i] = color.b;
    pixelsBuf[3 * c_len + i] = color.a;
  } 
/* 
  var img = lwip.create(json.data.length, json.data[0].length, 'black', function(err, image) {
    for (var i = 0; i < json.data.length; i++) {
      for (var j = 0; j < json.data[0].length; j++) {
        for (var l = 0; l < legend.levels.length-1; l++) {
          if (json.data[i][j] > legend.levels[l].value & json.data[i][j] <= legend.levels[l+1].value) {
            image.setPixel(i,j, legend.levels[l].color, function() {}); 
          }
        }
      }
    }
    console.log(image);
    image.writeFile('outfile.png', 'png', function(err){}); 
    return image;
  });
*/
  return pixelsBuf;
};
