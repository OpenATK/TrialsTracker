import React, { Proptypes } from 'react';
import { Decorator as Cerebral, Link } from 'cerebral-view-react';
import { CircleMarker, Polygon, Marker, Map, TileLayer, ImageOverlay, latLng, latLngBounds} from 'react-leaflet';
import styles from './map.css';
import uuid from 'uuid';
//import YieldTileLayer from '../CustomTileLayer/';
//var LatLon = require('geodesy').LatLonEllipsoidal;
var GeoJSON = require('react-leaflet').GeoJson;
//import jsonData from './2015J4.js';
//import jsonDataPoly from './2015J4Poly.js';
//import converter from 'hsl-to-rgb';
//import Color from 'color';
//import geojsonvt from 'geojson-vt';
//import { makeGeoJsonPolygons, makeGeoJsonPoints } from './geotiffConverter.js';
import { buildImage } from './geotiffConverter.js';
//import bair from './Bair100.js';
import gh from 'ngeohash';
import oadaIdClient from 'oada-id-client';
import { request } from 'superagent';
import RasterLayer from '../RasterLayer';

var tileIndex;

@Cerebral((props) => {
  return{
    notes: ['home', 'model', 'notes'],
    selectedNote: ['home', 'model', 'selected_note'],
    dragMode: ['home', 'view', 'dragMode'],
    drawMode: ['home', 'view', 'drawMode'],
    yield: ['home', 'yield' ],
    //note: ['home', 'model', 'notes', props.id],
  };
})

class _Map extends React.Component {

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
    const signals = this.props.signals.home;
    var self = this;
    var position = [40.8512578, -86.138977];
/*
    var notePolygons = [];
    _.each(this.props.notes, function(note) {
      notePolygons.push(<GeoJSON data={note.geojson} color={(note.id === self.props.selectedNote) ? "#FFFAFA" : note.color } dragging={true} key={uuid.v4()}/>);
    });

    var markerList = [];
    console.log(this.props.yield.length);
    _.each(this.props.yield, function(point) {
      var loc = L.latLng(point.lat, point.lon);
      markerList.push(<CircleMarker center={loc} radius={2} key={uuid.v4()}/>);
    });
*/  
    var drag_flag = this.props.dragMode;
    return (
      <div id='map-panel'>
        <button type="button" id='drag-button'  onClick={(e) => signals.ToggleMapp()}>Lock Map</button>
        <button type="button" id='draw-polygon' onClick={(e) => signals.DrawMode()}>Draw Polygon</button>
        <Map 
          onLeafletMousedown={ (e) => signals.mouseDownOnMap({vertex_value: e.latlng, select_note: this.props.selectedNote, newSelectedNote:this.props.id}) } 
          onLeafletMouseMove={ (e) => signals.mouseMoveOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
          onLeafletMouseUp={ (e) => signals.mouseUpOnMap({vertex_value: e.latlng, selected_note:this.props.selectedNote}) }
          dragging={this.props.dragMode} 
          center={position} 
          ref='map'
          zoom={13}>

          <TileLayer
            url="http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png"
            attribution='Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
          />
  
          <RasterLayer 
            url="http://localhost:3000/bookmarks/"
            accessToken={this.accessToken}
          />

        </Map> 
      </div>
    );
  }
}
export default _Map;
