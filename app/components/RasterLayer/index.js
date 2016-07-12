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
import uuid from 'uuid';
var db = {};

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
    db = new PouchDB('yield-data');
    super.componentWillMount();
    this.leafletElement.drawTile = this.drawTile.bind(this);
    this.renderTile = this.renderTile.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
    this.validate = this.validate.bind(this);
    this.recursiveDrawOnCanvas = this.recursiveDrawOnCanvas.bind(this);
    this.renderImageData = this.renderImageData.bind(this);
    this.drawTileGrid = this.drawTileGrid.bind(this);
    this.drawGeohashGrid = this.drawGeohashGrid.bind(this);
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

// Remove all references to the unloaded tile from this.canvas.
// Fire a signal to remove geohashes from currentGeohashes
  tileUnload(tile, url) {
    console.log('tileUnload');
    var geohashesToRemove = [];
    Object.keys(this.canvas).forEach((geohash) => {
      this.canvas[geohash].drawn = false;
      this.canvas[geohash].canvases = this.canvas[geohash].canvases.filter((cvs) => {
        return cvs.canvas !== tile.tile;
      })
      if (this.canvas[geohash].canvases.length == 0) {
        geohashesToRemove.push(geohash);
      }
    });
    if (geohashesToRemove.length > 0) {
      this.props.signals.home.tileUnloaded({geohashesToRemove});
    }
  }

  figureGeohashLevel(zoom, sw, ne) { 
    if (zoom >= 14) return 7;
    if (zoom <= 13 && zoom >= 11) return 6;
    if (zoom <= 10 && zoom >= 8) return 5;
    if (zoom <= 7 && zoom >= 6) return 4;
    if (zoom <= 5) return 3;
  }

//Compute the geohashes needed for this tile and save the canvas reference.
//This must be done on initial render even if a token isn't available because
//it is called independent of render.
  drawTile(canvas, tilePoint, zoom) {
    console.log('drawTile');
    new Promise(() => {
      var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
      var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
      var sw = this.props.map.unproject(tileSwPt, zoom);
      var ne = this.props.map.unproject(tileNePt, zoom);
      var precision =  this.figureGeohashLevel(zoom, sw, ne);
      var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
      if (this.props.geohashGridlines) this.drawGeohashGrid(canvas, tilePoint, zoom, geohashes, 'black', 1);
      if (this.props.tileGridlines) this.drawTileGrid(canvas, tilePoint, zoom);
      for (var g = geohashes.length-1; g > -1; g--) {
        //If the geohash isn't available, remove it from the list and continue.
        if (this.props.token && !this.props.availableGeohashes[geohashes[g]]) {
          geohashes.splice(g, 1);
          continue;
        }

        //Add canvas reference
        this.canvas[geohashes[g]] = this.canvas[geohashes[g]] || {
          drawn: false,
          canvases: [],
        };
        this.canvas[geohashes[g]].canvases.push({canvas, tilePoint});
        this.canvas[geohashes[g]].drawn = false;

        // If already on list, prevent unecessary state change
//        if (this.props.currentGeohashes[geohashes[g]]) {
//          console.log(geohashes[g] + ' removed here 2');
//          geohashes.splice(g,1);
//        }
      }


      if (Object.keys(geohashes).length > 0) {
        return this.props.signals.home.newTileDrawn({geohashes});
      }
    });
  }

//draw lines for the selected geohash grid level
  drawGeohashGrid(canvas, tilePoint, zoom, geohashes, color, width) {
    var ctx = canvas.getContext('2d');
    for (var g = 0; g < geohashes.length; g++) {
      var ghBounds = gh.decode_bbox(geohashes[g]); 
      var nw = this.props.map.project(new L.latLng(ghBounds[2], ghBounds[1]), zoom);
      var se = this.props.map.project(new L.latLng(ghBounds[0], ghBounds[3]), zoom);
      var w = nw.x - tilePoint.x*256;
      var n = nw.y - tilePoint.y*256;
      var e = se.x - tilePoint.x*256;
      var s = se.y - tilePoint.y*256;
/*
      if (w < 0) w = 0;
      if (n < 0) n = 0;
      if (e > 255) e = 255;
      if (s > 255) s = 255;
*/
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(w + 0.5, n + 0.5, e - w - 0.5, s - n - 0.5);
      ctx.closePath();
      ctx.stroke();
      this.leafletElement.tileDrawn(canvas);
    }   
  }

//draw lines for each tile  
  drawTileGrid(canvas, tilePoint, zoom) {
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = "1";
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.rect(0.5,0.5,255.5,255.5);
    ctx.closePath();
    ctx.stroke();
    this.leafletElement.tileDrawn(canvas);
  }
/*
              if (self.props.availableGeohashes[geohash]._rev !== result._rev) {
                console.log(self.props.availableGeohashes[geohash]);
                console.log(self.props.availableGeohashes[geohash]._rev, result._rev);
                const cache_result = cache.get(geohash, self.props.token, self.props.currentGeohashes[geohash]);
                cache_result.then(function(result) {
                  if (result) {
                    console.log('New geohash data on the server. Redrawing...');
                    self.renderImageData(canvas, result.aggregates, tilePoint);
*/
/*
                    if (self.props.map.getZoom() >= 15) {
                      self.renderImageData(canvas, result.data, tilePoint);
                    } else {
                      self.renderImageData(canvas, result.aggregates, tilePoint);
                    }
*/
//                  }
//                });     
//              }
 

  renderTile(canvas, geohash, tilePoint, rand) {
    var zoom = this.props.map.getZoom();
//    console.log('renderTile '+ rand);
    if (this.props.token) {
      var self = this;
      return Promise.try(function() {
        return cache.get(geohash, self.props.token, db)
        .then(function(data) {
          return self.renderImageData(canvas, data.aggregates, tilePoint, geohash)
        });
      });
    }
  }

  recursiveDrawOnCanvas(imageData, tilePoint, bounds, data, startIndex, canvas, context) {
    var keys = Object.keys(data);
    var self = this;
    var stopIndex = (keys.length < startIndex+100) ? keys.length : startIndex+100;
    return Promise.try(function() {
      var pixelData = imageData.data;
      for (var i = startIndex; i < stopIndex; i++) {
        var val = data[keys[i]];
        var latlng = L.latLng(val.location.lat, val.location.lon);
        if (bounds.contains(latlng)) {
          var pt = self.props.map.project(latlng);
          pt.x = Math.floor(pt.x - tilePoint.x*256);
          pt.y = Math.floor(pt.y - tilePoint.y*256);
          var color = self.colorForvalue(val.value);
          for (var m = -3; m < 4; m++) {
            for (var n = -3; n < 4; n++) {
              pixelData[(((pt.y+n)*256+pt.x+m)*4)]   = color.r; // red
              pixelData[(((pt.y+n)*256+pt.x+m)*4)+1] = color.g; // green
              pixelData[(((pt.y+n)*256+pt.x+m)*4)+2] = color.b; // blue
              pixelData[(((pt.y+n)*256+pt.x+m)*4)+3] = 128; // alpha
            }
          }
        }     
      }
      context.putImageData(imageData, 0, 0);
      return self.leafletElement.tileDrawn(canvas);
    }).then(function() {
      if (stopIndex != keys.length) {
        return self.recursiveDrawOnCanvas(imageData, tilePoint, bounds, data, stopIndex, canvas, context);
      }
    });
  }

  renderImageData(canvas, data, tilePoint, geohash) {
    var self = this;
    var zoom = self.props.map.getZoom();
    return Promise.try(function() {
      var ctx = canvas.getContext('2d');
      var imgData = ctx.getImageData(0, 0, 256, 256);
      var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
      var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
      var sw = self.props.map.unproject(tileSwPt, zoom);
      var ne = self.props.map.unproject(tileNePt, zoom);   
      var bounds = L.latLngBounds(sw, ne);
      return self.recursiveDrawOnCanvas(imgData, tilePoint, bounds, data, 0, canvas, ctx);
    }).then(function() {
      console.log('drawing over ', geohash);
      if (self.props.geohashGridlines) self.drawGeohashGrid(canvas, tilePoint, zoom, [geohash], 'black', 1);
      if (self.props.tileGridlines) self.drawTileGrid(canvas, tilePoint, zoom);
    });
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
      if (val > top.value) return top.color;
      if (val < bottom.value) return bottom.color;
      let percentIntoRange = (val - bottom.value) / (top.value - bottom.value);
      return blendColors(top.color, bottom.color, percentIntoRange);
 //   }
    console.log('ERROR: val = ', val, ', but did not find color!');
    return null;
  }

  validate(geohash) {
    return (this.props.currentGeohashes[geohash] !== this.props.availableGeohashes[geohash]._rev);
  }

  updateCanvas() {
    Object.keys(this.canvas).forEach((geohash) => {
      if (!this.props.availableGeohashes[geohash]) delete this.canvas[geohash];
    });
  }

  updateDrawn(geohash) {
    this.canvas[geohash].drawn = (this.props.currentGeohashes[geohash] !== this.props.availableGeohashes[geohash]._rev);
    return (this.props.currentGeohashes[geohash] !== this.props.availableGeohashes[geohash]._rev);
  }

  render() {
    var rand = uuid.v4();
//    console.log('render '+ rand);
    var self = this;
    const signals = this.props.signals.home;
/*
    if (this.props.liveData) {
      this.leafletElement.redraw();
      setTimeout(signals.liveDataRequested({}), 3000);
    }
*/
    if (Object.keys(this.props.availableGeohashes).length > 0) {
      this.updateCanvas();
      var geohashes = Object.keys(this.canvas);
      Promise.map(geohashes, function(geohash) {
        if (self.canvas[geohash].drawn) {
          return false;
         } else {
          self.canvas[geohash].drawn = true;
          return Promise.map(self.canvas[geohash].canvases, function(cvs) {
            return self.renderTile(cvs.canvas, geohash, cvs.tilePoint, rand);
          }); 
        }
      }).then(function() {
      //  TODO check whether any geohashes were actually drawn
 //       console.log('outer loop finished ' + rand);
        signals.geohashDrawn({geohashes});
      });
    }
//    console.log('returning super '+rand);
    return super.render();
  }
}
