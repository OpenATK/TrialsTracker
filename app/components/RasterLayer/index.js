import { Decorator as Cerebral } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import { Promise } from 'bluebird';
import cache from './cache.js';
var agent = require('superagent-promise')(require('superagent'), Promise);

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
    availableGeohashes: ['home', 'model', 'available_geohashes'],
    currentGeohashes: ['home', 'model', 'current_geohashes'],
    liveData: ['home', 'live_data'],
    token: ['home', 'token', 'access_token'],
  };
})

export default class RasterLayer extends CanvasTileLayer {

  componentWillMount() {
    super.componentWillMount();
    this.leafletElement.drawTile = this.drawTile.bind(this);
    this.renderTile = this.renderTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
    this.leafletElement.on('tileunload', this.tileUnload);
    this.canvas = {};
  }

  componentWillUnmount() {
    console.log('unmounting');
    console.log(this);
  }

  shouldComponentUpdate() {
    return true;
  }

  tileUnload(tile, url) {
    var geohashes = [];
    //TODO: register/unregister current geohashes
    Object.keys(this.canvas).forEach((geohash) => {
      this.canvas[geohash] = this.canvas[geohash].filter((cvs) => {
        return cvs.canvas !== tile;
      })
    });
  }

//Compute the geohash tiles needed for this image tile and save the canvas references
  drawTile(canvas, tilePoint, zoom) {
    var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
    var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
    var sw = this.props.map.unproject(tileSwPt, zoom);
    var ne = this.props.map.unproject(tileNePt, zoom);
    var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, 7);
    for (var g = 0; g < geohashes.length; g++) {
    //  if (this.props.availableGeohashes[geohashes[g]]) {
      this.canvas[geohashes[g]] = []
      this.canvas[geohashes[g]].push({canvas, tilePoint});
    //  }
    }
  }

  renderTile(canvas, geohash, tilePoint) {
    var self = this;

    return new Promise(function() {
      if (self.props.token) {
        const cache_result = cache.tryGet(geohash);
        if (cache_result.isFulfilled()) {
          cache_result.then(function(result) {
            if (result) {
              console.log('getting from cache, drawing');
              self.renderImageData(canvas, result.data, tilePoint);
            }
          });
        } 
      }
 
      if (self.props.availableGeohashes[geohash]) {
        const cache_result = cache.get(geohash, 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-7/', self.props.token, self.props.currentGeohashes[geohash]);
        cache_result.then(function(result) {
          if (result) {
            console.log('got from server. drawing');
            self.renderImageData(canvas, result.data, tilePoint);
          }
        });
      }
    });
  }
  
  renderImageData(canvas, data, tilePoint) {
    var zoom = this.props.map.getZoom();
    var db = new PouchDB('yield-data');
    var ctx = canvas.getContext('2d');
    var imgData = ctx.getImageData(0,0, 256, 256);
    var pixelData = imgData.data;
    var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
    var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
    var sw = this.props.map.unproject(tileSwPt, zoom);
    var ne = this.props.map.unproject(tileNePt, zoom);   
    var zoom = this.props.map.getZoom();
    var bounds = L.latLngBounds(sw, ne);
    var self = this;
    _.each(data, function(val) {
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
    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0); 
    self.leafletElement.tileDrawn(canvas);   
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
    const signals = this.props.signals.home;
    console.log('RASTERLAYER RENDER');
    console.log(this);
/*
    if (this.props.liveData) {
      this.leafletElement.redraw();
      setTimeout(signals.liveDataRequested({}), 3000);
    }
*/
    if (this.props.availableGeohashes) {
      console.log('render');
      var promises = [];
      var geohashes = [];
      Object.keys(this.canvas).forEach((geohash) => {
        if (this.props.availableGeohashes[geohash]) {
          if (this.props.currentGeohashes[geohash] !== this.props.availableGeohashes[geohash]._rev) {
            geohashes[geohash] = this.props.availableGeohashes[geohash]._rev;
            this.canvas[geohash].forEach((cvs) =>
            promises.push(this.renderTile(cvs.canvas, geohash, cvs.tilePoint)))
          }
        }
      });
      Promise.all(promises)
      .then(function() {
        signals.recievedUpdatedGeohashes({geohashes});
      });
      return super.render();
    } else {
      return null;
    }
  }
}
