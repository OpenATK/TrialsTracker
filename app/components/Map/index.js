import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds} from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';
import YieldTileLayer from '../CustomTileLayer/';
var LatLon = require('geodesy').LatLonEllipsoidal;
var GeoJSON = require('react-leaflet').GeoJson;
//import jsonData from './2015J4.js';
//import jsonDataPoly from './2015J4Poly.js';
import converter from 'hsl-to-rgb';
import Color from 'color';
import geojsonvt from 'geojson-vt';
//import { makeGeoJsonPolygons, makeGeoJsonPoints } from './geotiffConverter.js';
import { buildImage } from './geotiffConverter.js';
//import { create } from 'lwip';
//var c = require('lwip').create;
import ph from './ph_4326.js';
var tileIndex;

@Cerebral((props) => {
  return{
    notes: ['home', 'model', 'notes'],
    selectedNote: ['home', 'model', 'selected_note'],
    //note: ['home', 'model', 'notes', props.id],
  };
})

class _Map extends React.Component {

  componentWillMount() {
    console.log('component will mount');
    
    let tileOptions = {
      maxZoom:20
    };
 //   tileIndex = geojsonvt(ph, tileOptions);
  }

/* 
  getColor(val, min, max) {
    var rng = (max-min);
    var h = (val - min)/(rng)*150;
    var s = 100;
    var l = 50;
    return Color().hsl(h,s,l).rgbString();
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
  render() {
  //  var position = [48.99, -104.05];
  //  var position = [jsonData.features[0].geometry.coordinates[1], jsonData.features[0].geometry.coordinates[0]];
    var geoJSONData = [];
    _.each(this.props.notes, function(note) {
      geoJSONData.push(<GeoJSON data={note.geojson} color={note.color} key={uuid.v4()}/>);
    });

/*
    var pollies = [];
    var positions;
    for (let i = jsonData.features.length-1; i > 1; i--) {
      positions = this.getPolygonVertices(jsonData.features[i], jsonData.features[i-1]);
      var col = this.getColor(jsonData.features[i].properties.Yld_Vol_We,min,max);
      var poly = <Polygon positions={positions} key={uuid.v4()} stroke={false} fillColor={col} fillOpacity={1.0} />;
      pollies.push(poly);
      newJson.features[i] = this.createPoly(jsonData.features[i], jsonData.features[i-1]);
    }
    newJson.features.splice(0, 1);
    var geoj = <GeoJSON data={newJson} key={uuid.v4()}/>;
*/  
    var position = [4.497, -72.842];
    const signals = this.props.signals.home;
//            url='http://{s}.{base}.maps.cit.api.here.com/maptile/2.1/{type}/{mapID}/hybrid.day/{z}/{x}/{y}/{size}/{format}?app_id={app_id}&app_code={app_code}&lg={language}'
//            attribution='Map &copy; 1987-2014 <a href="http://developer.here.com">HERE</a>'

//            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
//            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'

//            url='http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
//            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
  //        <YieldTileLayer tileIndex={tileIndex}/>

      //    <ImageOverlay 
       //     url={buildImage(ph)}
       //     bounds={bounds}
       //   />
    return (
      <div id='map-panel'>
        <Map onLeafletMousedown={(e) => {signals.mouseDownOnMap({vertex_value: e.latlng, select_note: this.props.selectedNote, newSelectedNote:this.props.id})}} dragging={true} center={position} zoom={19} tms={true}>
          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
          <YieldTileLayer/>
        </Map> 
      </div>
    );
  }
}
export default _Map;
