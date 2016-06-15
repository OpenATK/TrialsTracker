import { Decorator as Cerebral } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import bair from './Bair100.js';
import { Promise } from 'bluebird';
import cache from './cache.js';

function blendColors(c1, c2, percent) {
  let a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
  let a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
  return { 
    r: c1.r * percent + c2.r * (1-percent),
    g: c1.g * percent + c2.g * (1-percent),
    b: c1.b * percent + c2.b * (1-percent),
    a:   a1 * percent +   a2 * (1-percent),
  };
}

@Cerebral((props) => {
  return {
    selectedMap: [ 'home', 'model', 'selected_map' ],
    token: [ 'home', 'token' ],
    yieldRevs: [ 'home', 'yield_revs' ],
  };
})

export default class RasterLayer extends CanvasTileLayer {

  componentWillMount() {
    super.componentWillMount();
    this.leafletElement.drawTile = this.drawTile.bind(this);
  }

  componentWillUnmount() {
    this.canvas.remove();
  }

  drawTile(canvas, tilePoint, zoom) {
    var db = new PouchDB('yield-data');
    var self = this;
    const signals = this.props.signals.home;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(256, 256);
    var pixelData = imgData.data;

//Optionally, a cached tile may be requested here and loaded immediately! Then asynctasks move forward
 
    //Compute the geohash tiles needed for this image tile
    var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
    var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
    var sw = this.props.map.unproject(tileSwPt, zoom);
    var ne = this.props.map.unproject(tileNePt, zoom);
    var bounds = L.latLngBounds(sw, ne);
    var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, 7);

    var filtGeos = [];
    for (var g = 0; g < geohashes.length; g++) {
      if (bair[geohashes[g]]) {
        filtGeos.push(geohashes[g]); 
      }
    }
    
    //TODO: presence of a token should change state, cause a rerender
    if (this.props.token.access_token) {
      var promises = [];
      for (var g = 0; g < filtGeos.length; g++) {
        const cache_result = cache.tryGet(filtGeos[g]);
        if (cache_result.isFulfilled()) {
          cache_result.then(function(result) {
            if (result) {
              signals.recievedRequestResponse({geohash: filtGeos[g], rev:result._rev});
              _.each(result.data, function(val) {
                var latlng = L.latLng(val.location.lat, val.location.lon, zoom);
                var pt = self.props.map.project(latlng);
                pt.x = Math.floor(pt.x - tilePoint.x*256);
                pt.y = Math.floor(pt.y - tilePoint.y*256);
                if (bounds.contains(latlng)) {
                  var color = self.colorForvalue(val.value);
                  pixelData[((pt.y*256+pt.x)*4)]   = color.r; // red
                  pixelData[((pt.y*256+pt.x)*4)+1] = color.g; // green
                  pixelData[((pt.y*256+pt.x)*4)+2] = color.b; // blue
                  pixelData[((pt.y*256+pt.x)*4)+3] = 128; // alpha
                }
              });
            }
          });
        } else {
          //TODO: Show loading tile image
        }
        promises.push(cache_result);
      }
      Promise.all(promises).then(function() {
        ctx.putImageData(imgData, 0, 0);
        ctx.drawImage(canvas, 0, 0); 
        self.leafletElement.tileDrawn(canvas);
      });

      var proms = [];
      for (var g = 0; g < filtGeos.length; g++) {
        //first, get the rev to compare
        
        //If new data, update.
        //TODO: consider writing a signal that calls an update function
        const cache_result = cache.get(filtGeos[g], 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/', this.props.token.access_token);
        cache_result.then(function(result) {
          if (result) {
            _.each(result.data, function(val) {
              var latlng = L.latLng(val.location.lat, val.location.lon, zoom);
              var pt = self.props.map.project(latlng);
              pt.x = Math.floor(pt.x - tilePoint.x*256);
              pt.y = Math.floor(pt.y - tilePoint.y*256);
              if (bounds.contains(latlng)) {
                var color = self.colorForvalue(val.value);
                pixelData[((pt.y*256+pt.x)*4)]   = color.r; // red
                pixelData[((pt.y*256+pt.x)*4)+1] = color.g; // green
                pixelData[((pt.y*256+pt.x)*4)+2] = color.b; // blue
                pixelData[((pt.y*256+pt.x)*4)+3] = 128; // alpha
              }
            });
          }
        });
        proms.push(cache_result);
      }
      Promise.all(proms).then(function() {
        ctx.putImageData(imgData, 0, 0);
        ctx.drawImage(canvas, 0, 0); 
        self.leafletElement.tileDrawn(canvas);
      });
    }
  }
    
  colorForvalue(val) {

//    if (val == raster.nodataval) {
//      return {r: 0, g: 0, b: 0, a: 0 };
//    }
//    const levels = raster.legend.levels;
//    const numlevels = levels.length;
//    if (val <= levels[0].value) {
//      return levels[0].color;
//    }
//    if (val >= levels[numlevels-1].value) {
//      return levels[numlevels-1].color;
//    }
//    for (let i = 0; i < numlevels-1; i++) {
//      let bottom = levels[i];
      let bottom = {
        value: 0,
        color: {
          r: 255,
          g: 0,
          b: 0,
          a: 255,
        },
      }
//      let top = levels[i+1];
      let top = {
        value: 500,
        color: {
          r: 0,
          g: 255,
          b: 0,
          a: 255,
        },
      }; 
      if (val > bottom.value && val <= top.value) {
        let percentIntoRange = (val - bottom.value) / (top.value - bottom.value);
        return blendColors(top.color, bottom.color, percentIntoRange);
      }
 //   }
    console.log('ERROR: val = ', val, ', but did not find color!');
    return null;
  }

  render() {
    return super.render();
  }
}
