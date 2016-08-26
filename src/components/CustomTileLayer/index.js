import {CanvasTileLayer} from 'react-leaflet';
import React, { PropTypes } from 'react';
import { Map, Point, latLng, latLngToContainerPoint } from 'react-leaflet';
import _ from 'lodash';
import jsonData from '../Map/2015J4.js';
//import jsonDataPoly from '../Map/2015J4Poly.js';
//import { LatLonEllipsoidal, Dms } from 'geodesy';
import Color from 'color';
import { buildImage } from '../Map/geotiffConverter.js';
import ph from '../Map/ph_4326.js';

class YieldTileLayer extends CanvasTileLayer {
  
  componentWillMount() {
    super.componentWillMount();
    this.leafletElement.drawTile = this.drawTile.bind(this);
  }

  getColor(val, min, max) {
    if (val == -9999) return '#00000000';
    var rng = (max-min);
    var h = (val - min)/(rng)*150;
    var s = 100;
    var l = 50;
    return Color().hsl(h,s,l).rgbaString();
//    return [0, 0, 0, 255];
  }
 
 /* 
  getIndex(x, y) {
    return i;
  }

  makeImg(img, r, g, b, a) {
    var data = img.data;
    for (var i = 0; i < data.length; i += 4) {
      data[i]     = r;     // red
      data[i + 1] = g; // green
      data[i + 2] = b; // blue
      data[i + 3] = a; // blue
    }
    return img;
  }
*/


/*
// For each yield data point, color the pixel in which that point falls!
  drawTile(canvas, tilePoint, zoom) {
    let ctx = canvas.getContext('2d');
    let top = canvas.style.top;
    let left = canvas.style.left;
    // remove 'px' from the end of the string and convert to number
    top = parseInt(top.substring(0, top.length-2));
    left = parseInt(left.substring(0, left.length-2));
    var self = this;
    let img = ctx.createImageData(256, 256, top, left);
    let color = [];
    _.each(jsonData.features, function(ft) {
      let latLng = L.latLng(ft.geometry.coordinates[1], ft.geometry.coordinates[0]);
// Project the coordinates to pixel coordinates from the origin (notice it takes into account zoom level) 
      let projPt = self.props.map.project(latLng, zoom);
// Divide each ordinate by 256 to find which tile it is in
      let layPt = self.props.map.latLngToLayerPoint(latLng);
      if (Math.floor(projPt.x/256) == tilePoint.x && Math.floor(projPt.y/256) == tilePoint.y) {
        color = self.getColor(ft.properties.Yld_Vol_We, 0, 391);
// Get the pixel location of each point feature. tilePoint.x*256 is the number of pixels up to the beginning of tile x
        var x = Math.floor((projPt.x-tilePoint.x*256));
        var y = Math.floor((projPt.y-tilePoint.y*256));
        let i = ((y*(img.width*4)) + (x*4));
        img.data[i] = color.r;
        img.data[i+1] = color.g;
        img.data[i+2] = color.b;
        img.data[i+3] = 255;
      }
    });
    ctx.putImageData(img, 0, 0);
*/


// Draw an image from data using the canvas   
  drawTile(canvas, tilePoint, zoom) {
    let ctx = canvas.getContext('2d');
// Get 
// remove 'px' from the end of the string and convert to number
    let top = canvas.style.top;
    let left = canvas.style.left;
    top = parseInt(top.substring(0, top.length-2));
    left = parseInt(left.substring(0, left.length-2));
//    let imgdata = ctx.createImageData(ph.data.length, ph.data[0].length);
    let img = ctx.createImageData(256, 256, top, left);
    let color = [];
    let latLng = L.latLng(ph.geotransform[3], ph.geotransform[0]);
// Project the coordinates to pixel coordinates from the origin (notice it takes into account zoom level) 
    let projPt = this.props.map.project(latLng, zoom);
// Divide each ordinate by 256 to find which tile it is in
    if (Math.floor(projPt.x/256) == tilePoint.x && Math.floor(projPt.y/256) == tilePoint.y) {
//Right now, after I find the tile where data should be placed, I color it all white
      var data = img.data;  
      for (var i = 0; i < data.length; i += 4) {
        data[i]     = 0; // red
        data[i + 1] = 0; // green
        data[i + 2] = 0; // blue
        data[i + 3] = 0; // alpha 
      }
      ctx.putImageData(img, 0, 0);
    }
  }


/*
// Render geojson-vt tiles!
  drawTile(canvas, tilePoint, zoom) {
    var padding = 0;
    var totalExtent = 4096 * (1 + padding * 2);
    var height = canvas.height;
    var ratio = height / totalExtent;
    var pad = 4096 * padding * ratio;

    var tile = this.props.tileIndex.getTile(zoom, tilePoint.x, tilePoint.y);

    if (!tile) {
      console.log('tile empty');
      return;
    }

    ctx.clearRect(0, 0, canvas.height, canvas.height);
    var features = tile.features;
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'rgba(255,0,0,0.05)';

    for (var i = 0; i < features.length; i++) {
      var feature = features[i],
          type = feature.type;

      ctx.beginPath();

      for (var j = 0; j < feature.geometry.length; j++) {
        var geom = feature.geometry[j];
        if (type === 1) {
          ctx.arc(geom[0] * ratio + pad, geom[1] * ratio + pad, 2, 0, 2 * Math.PI, false);
          continue;
        }

        for (var k = 0; k < geom.length; k++) {
          var p = geom[k];
          if (k) ctx.lineTo(p[0] * ratio + pad, p[1] * ratio + pad);
          else ctx.moveTo(p[0] * ratio + pad, p[1] * ratio + pad);
        }
      }

      if (type === 3 || type === 1) ctx.fill('evenodd');
      //ctx.fillStyle = this.getColor(feature.tags.Yld_Vol_We, 0, 316);
      ctx.fillStyle = this.getColor(feature.tags.value, 4, 5.15);
      ctx.fill();
//      ctx.stroke();
    }
*/
/*
    var halfHeight = height / 2;
    ctx.strokeStyle = 'lightgreen';
    ctx.strokeRect(pad, pad, height - 2 * pad, height - 2 * pad);
    ctx.beginPath();
    ctx.moveTo(pad, halfHeight);
    ctx.lineTo(height - pad, halfHeight);
    ctx.moveTo(halfHeight, pad);
    ctx.lineTo(halfHeight, height - pad);
    ctx.stroke();
  }
*/


}
export default YieldTileLayer;
