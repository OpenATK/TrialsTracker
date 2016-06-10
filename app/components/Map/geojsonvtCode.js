//import jsonData from './2015J4.js';
//import jsonDataPoly from './2015J4Poly.js';
//import converter from 'hsl-to-rgb';
//import Color from 'color';
//import geojsonvt from 'geojson-vt';
//import { makeGeoJsonPolygons, makeGeoJsonPoints } from './geotiffConverter.js'; 
//import YieldTileLayer from '../CustomTileLayer/';
//var LatLon = require('geodesy').LatLonEllipsoidal;


componentWillMount() {
    let tileOptions = {
      maxZoom:20
    };
 //   tileIndex = geojsonvt(ph, tileOptions);
  }

  getTiles(e) {
    console.log(this.refs);
    var bounds = e.target.getBounds();
    var geohashesNeeded = gh.bboxes(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast(), 7);
  }


  createPoly(feature1, feature2) {
    // create a LatLon from the point
    var pt1 = LatLon(feature1.geometry.coordinates[1], feature1.geometry.coordinates[0]);
    var pt2 = LatLon(feature2.geometry.coordinates[1], feature2.geometry.coordinates[0]);

    //find the angle between this point and the previous
    var angle1 = feature1.properties.Track_deg_;
    var angle2 = feature2.properties.Track_deg_;

    //build the polygon positions array by taking the tangent
    var vertexA = pt1.destinationPoint(2.286, angle1+90);
    var vertexB = pt1.destinationPoint(2.286, angle1-90);
    var vertexC = pt2.destinationPoint(2.286, angle2+90);
    var vertexD = pt2.destinationPoint(2.286, angle2-90);
    var positions = [[
      [vertexA.lon, vertexA.lat],
      [vertexB.lon, vertexB.lat],
      [vertexD.lon, vertexD.lat],
      [vertexC.lon, vertexC.lat],
      [vertexA.lon, vertexA.lat]
    ]];
    feature1.geometry.type = "Polygon";
    feature1.geometry.coordinates = positions;
    return feature1;
  }

  getPolygonVertices(feature1, feature2) {
    // create a LatLon from the point
    var pt1 = LatLon(feature1.geometry.coordinates[1], feature1.geometry.coordinates[0]);
    var pt2 = LatLon(feature2.geometry.coordinates[1], feature2.geometry.coordinates[0]);

    //find the angle between this point and the previous
    var angle1 = feature1.properties.Track_deg_;
    var angle2 = feature2.properties.Track_deg_;

    //build the polygon positions array by taking the tangent
    var vertexA = pt1.destinationPoint(2.286, angle1+90);
    var vertexB = pt1.destinationPoint(2.286, angle1-90);
    var vertexC = pt2.destinationPoint(2.286, angle2+90);
    var vertexD = pt2.destinationPoint(2.286, angle2-90);
    var positions = [
      [vertexA.lat, vertexA.lon],
      [vertexB.lat, vertexB.lon],
      [vertexD.lat, vertexD.lon],
      [vertexC.lat, vertexC.lon]
    ];
    return positions;
  } 
*/

