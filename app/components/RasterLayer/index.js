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
    this.drawGeohashBounds = this.drawGeohashBounds.bind(this);
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

      if (this.props.geohashGridlines) this.drawGeohashGrid(canvas, tilePoint, zoom, geohashes);
      if (this.props.tileGridlines) this.drawTileGrid(canvas, tilePoint, zoom);

      if (Object.keys(geohashes).length > 0) {
        return this.props.signals.home.newTileDrawn({geohashes});
      }
    });
  }

//draw lines for the selected geohash grid level
  drawGeohashGrid(canvas, tilePoint, zoom, geohashes) {
    for (var g = 0; g < geohashes.length; g++) {
      this.drawGeohashBounds(canvas, geohashes[g], tilePoint, zoom, 'black', 0.5);
    }   
  }

//draw lines for each tile  
  drawTileGrid(canvas, tilePoint, zoom) {
    var ctx = canvas.getContext('2d');
    var imgData = ctx.getImageData(0,0, 256, 256);
    var pixelData = imgData.data;
    for (var i = 0; i < 256; i++) {
      pixelData[(i*256+0)*4] = 255;
      pixelData[((i*256+0)*4)+1] = 255;
      pixelData[((i*256+0)*4)+2] = 255;
      pixelData[((i*256+0)*4)+3] = 255;

      pixelData[(i*256+255)*4] = 255;
      pixelData[((i*256+255)*4)+1] = 255;
      pixelData[((i*256+255)*4)+2] = 255;
      pixelData[((i*256+255)*4)+3] = 255;

      pixelData[(255*256+i)*4] = 255;
      pixelData[((255*256+i)*4)+1] = 255;
      pixelData[((255*256+i)*4)+2] = 255;
      pixelData[((255*256+i)*4)+3] = 255;

      pixelData[(0*256+i)*4] = 255;
      pixelData[((0*256+i)*4)+1] = 255;
      pixelData[((0*256+i)*4)+2] = 255;
      pixelData[((0*256+i)*4)+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(canvas, 0, 0); 
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
//    console.log('renderTile '+ rand);
    if (this.props.token) {
      var self = this;
      return Promise.try(function() {
        return cache.get(geohash, self.props.token, self.props.currentGeohashes[geohash], db)
        .then(function(data) {
          self.renderImageData(canvas, data.aggregates, tilePoint);
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
          pixelData[((pt.y*256+pt.x)*4)]   = color.r; // red
          pixelData[((pt.y*256+pt.x)*4)+1] = color.g; // green
          pixelData[((pt.y*256+pt.x)*4)+2] = color.b; // blue
          pixelData[((pt.y*256+pt.x)*4)+3] = 128; // alpha
        }     
      }
      context.putImageData(imageData, 0, 0);
      self.leafletElement.tileDrawn(canvas);
    }).then(function() {
      if (stopIndex != keys.length) {
        self.recursiveDrawOnCanvas(imageData, tilePoint, bounds, data, stopIndex, canvas, context);
      }
    });
  }

  renderImageData(canvas, data, tilePoint) {
    var zoom = this.props.map.getZoom();
    var ctx = canvas.getContext('2d');
    var imgData = ctx.getImageData(0, 0, 256, 256);
    var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
    var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
    var sw = this.props.map.unproject(tileSwPt, zoom);
    var ne = this.props.map.unproject(tileNePt, zoom);   
    var bounds = L.latLngBounds(sw, ne);
    var self = this;
    return Promise.try(function() {
      self.recursiveDrawOnCanvas(imgData, tilePoint, bounds, data, 0, canvas, ctx);
    });
  }

  drawGeohashBounds(canvas, geohash, tilePoint, zoom, color, width) {
    var ctx = canvas.getContext('2d');
    var ghBounds = gh.decode_bbox(geohash); 
    var sw = this.props.map.project(new L.latLng(ghBounds[0], ghBounds[1]), zoom);
    sw.x = sw.x - tilePoint.x*256;
    sw.y = sw.y - tilePoint.y*256;
    var nw = this.props.map.project(new L.latLng(ghBounds[2], ghBounds[1]), zoom);
    nw.x = nw.x - tilePoint.x*256;
    nw.y = nw.y - tilePoint.y*256;
    var se = this.props.map.project(new L.latLng(ghBounds[0], ghBounds[3]), zoom);
    se.x = se.x - tilePoint.x*256;
    se.y = se.y - tilePoint.y*256;
    var ne = this.props.map.project(new L.latLng(ghBounds[2], ghBounds[3]), zoom);
    ne.x = ne.x - tilePoint.x*256;
    ne.y = ne.y - tilePoint.y*256;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(sw.x, sw.y);
    ctx.lineTo(nw.x, nw.y);
    ctx.lineTo(ne.x, ne.y);
    ctx.lineTo(se.x, se.y);
    ctx.closePath();
    ctx.stroke();
    this.leafletElement.tileDrawn(canvas);
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
    console.log('render '+ rand);
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
