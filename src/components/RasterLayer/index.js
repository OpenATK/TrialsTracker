import React from 'react';
import { connect } from 'cerebral-view-react';
import { GridLayer, Point } from 'react-leaflet';
import styles from './style.css';
import gh from 'ngeohash';
import request from 'superagent';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import Promise from 'bluebird';
import cache from '../../modules/Cache/cache.js';
import uuid from 'uuid';
import Color from 'color';
var agent = require('superagent-promise')(require('superagent'), Promise);
import L from 'leaflet';

function blendColors(c1, c2, percent) {
  let a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
  let a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
  return { 
    r: c1.r * percent + c2.r * (1-percent),
    g: c1.g * percent + c2.g * (1-percent),
    b: c1.b * percent + c2.b * (1-percent),
    a: 0.9999,
//    a:   a1 * percent +   a2 * (1-percent),
  };
}

export default connect(props => ({
  dataIndex: `${props.data}`,
  geohashesToDraw: `app.view.map.geohashes_to_draw.${props.layer}`,
  token: 'app.view.server.token',
  legend: `app.view.legends.${props.layer}`,
}), {
  tileUnloaded: 'app.tileUnloaded',
  geohashDrawn: 'app.geohashDrawn',
  newTileDrawn: 'app.newTileDrawn',
},

class RasterLayer extends GridLayer {
  
  componentWillMount() {
    super.componentWillMount();
    this.leafletElement.createTile = this.createTile.bind(this);
    this.getTileData = this.getTileData.bind(this);
    this.tileUnload = this.tileUnload.bind(this);
    this.recursiveDrawOnCanvas = this.recursiveDrawOnCanvas.bind(this);
    this.drawTileGrid = this.drawTileGrid.bind(this);
    this.drawGeohashGrid = this.drawGeohashGrid.bind(this);
    this.leafletElement.on('tileunload', this.tileUnload);
    this.canvas = {};
  }
  
  shouldComponentUpdate() {
    return true;
  }

//Inherited by CanvasTileLayer, this is called when a tile goes offscreen. 
//Filter to find and remove canvases that have gone offscreen from the 
//this.canvas variable. Then, fire a signal to remove geohashes from the 
//current_geohashes list in state. Called once per tile.
  tileUnload(tile) {
    var geohashesToRemove = [];
    Object.keys(this.canvas).forEach((geohash) => {
    //  this.canvas[geohash].drawn = false;
      this.canvas[geohash].canvases = this.canvas[geohash].canvases.filter((cvs) => {
        return cvs.canvas !== tile.tile;
      })
      if (this.canvas[geohash].canvases.length < 1) {
        delete this.canvas[geohash];
        geohashesToRemove.push(geohash);
      }
    })
    if (geohashesToRemove.length > 0) {
      this.props.tileUnloaded({geohashesToRemove});
    }
  }

//This function is required by the CanvasTileLayer class. This is called only
//when the map is panned/zoomed and new tiles are revealed (not render). 
//Compute the geohashes needed for this tile and save the canvas reference. 
  createTile(coords, done) {
    var self = this;
    var error;
    var canvas = L.DomUtil.create('canvas', 'leaflet-tile');
    canvas.height = 256;
    canvas.width = 256;
    new Promise(function() {
      var tileSwPt = new L.Point(coords.x*256, (coords.y*256)+256);
      var tileNePt = new L.Point((coords.x*256)+256, coords.y*256);
      var sw = self.props.map.unproject(tileSwPt, coords.z);
      var ne = self.props.map.unproject(tileNePt, coords.z);
      var precision = self.getGeohashLevel(coords.z, sw, ne);
      var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
/*
      if (self.props.geohashGridlines) {
        var geohashesGrids = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision+2);
        self.drawGeohashGrid(canvas, coords, geohashesGrids, 'black', 1);
      }
      if (self.props.tileGridlines) self.drawTileGrid(canvas, coords);
*/
      if (self.props.dataIndex) {
        return Promise.filter(geohashes, function(geohash) {
//If the geohash isn't available, remove it from the list and continue.
          return typeof(self.props.dataIndex['geohash-'+precision][geohash]) !== 'undefined';
        }, {concurrency: 1}).then(function(geohashes) {
        //  setTimeout(function() {
            return Promise.map(geohashes, function(geohash) {
//Add canvas reference
              self.canvas[geohash] = self.canvas[geohash] || {
                canvases: [],
              };
              self.canvas[geohash].canvases.push({canvas, coords});
              self.canvas[geohash].drawn = false;
              return Promise.map(self.canvas[geohash].canvases, function(cvs, idx) {
                return self.getTileData(cvs.canvas, geohash, cvs.coords, idx, done);
              })
            })
     //     }.bind(this), 0);
        }).then(function() {
          if (geohashes.length > 0) {
            self.props.newTileDrawn({geohashes: geohashes, layer: self.props.layer});
          }
          return canvas;
        })
      } else {
        return null;
      }
    })
    return canvas;
  }
 
// This function gets the geohash data from cache/server and hands it to a draw function
  getTileData(canvas, geohash, coords, index, done) {
    var self = this;
    var url = this.props.url+'/geohash-length-index/'+'geohash-'+(geohash.length)+'/geohash-index/'+geohash.substring(0,geohash.length)+'/geohash-data/';
    return cache.get(url, this.props.token)
    .then(function(data) {
      //After coming back from the cache, detect whether the canvas is still current.
      if (!self.canvas[geohash]) {
        return null;
      }
      if (!self.canvas[geohash].canvases[index]) {
        return null;
      }
      if (self.canvas[geohash].canvases[index].coords != coords) {
        return null;
      }
      if (!data) {
        return null;
      }
      self.canvas[geohash].drawn = true;
      return self.recursiveDrawOnCanvas(coords, data, 0, canvas);
    }).then(function() {
// Grid lines must be drawn on top using the same canvas as the yield data.
/*
      if (self.props.geohashGridlines) {
        var bbox = gh.decode_bbox(geohash);
        var geohashesGrids = gh.bboxes(bbox[0], bbox[1], bbox[2], bbox[3], geohash.length+2);
        self.drawGeohashGrid(canvas, coords, geohashesGrids, 'black', 1);
      }
      if (self.props.tileGridlines) self.drawTileGrid(canvas, coords);
*/
//      return self.leafletElement.tileDrawn(canvas);
       var error;
       done(error, canvas);
       return true;
    })
  }

 // This function recursively draws 100 yield data points
  recursiveDrawOnCanvas(coords, data, startIndex, canvas) {
    setTimeout(function() {
      var keys = Object.keys(data);
      var self = this;
      var stopIndex = (keys.length < startIndex+200) ? keys.length : startIndex+200;
      Promise.try(function() {
        for (var i = startIndex; i < stopIndex; i++) {
          var val = data[keys[i]];
          var ghBounds = gh.decode_bbox(keys[i]); 
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

          //Fill the entire geohash aggregate with the appropriate color
          var context = canvas.getContext('2d');
          context.lineWidth = 0;
          var col = self.colorForvalue(val.weight.sum/val.area.sum, levels);
          context.beginPath();
          context.rect(w, n, width, height);
          context.fillStyle = Color(col).hexString();
          context.fill();
        }
        return canvas;
      })
      if (stopIndex != keys.length) {
        return self.recursiveDrawOnCanvas(coords, data, stopIndex, canvas);
      } 
      return canvas;
    }.bind(this), 0);
  }
 
  getGeohashLevel(zoom, sw, ne) { 
    if (zoom >= 15) return 7;
    if (zoom >= 12) return 6;
    if (zoom >= 8) return 5;
    if (zoom >= 6) return 4;
    if (zoom <= 5) return 3;
  }

  drawGeohashGrid(canvas, coords, geohashes, color, width) {
    var ctx = canvas.getContext('2d');
    for (var g = 0; g < geohashes.length; g++) {
      var ghBounds = gh.decode_bbox(geohashes[g]); 
      var nw = this.props.map.project(new L.latLng(ghBounds[2], ghBounds[1]), coords.z);
      var se = this.props.map.project(new L.latLng(ghBounds[0], ghBounds[3]), coords.z);
      var w = nw.x - coords.x*256;
      var n = nw.y - coords.y*256;
      var e = se.x - coords.x*256;
      var s = se.y - coords.y*256;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(w + 0.5, n + 0.5, e - w - 0.5, s - n - 0.5);
      ctx.closePath();
      ctx.stroke();
//      this.leafletElement.tileDrawn(canvas);
    }   
  }

  drawTileGrid(canvas, coords) {
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = "1";
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.rect(0.5,0.5,255.5,255.5);
    ctx.closePath();
    ctx.stroke();
//    this.leafletElement.tileDrawn(canvas);
  } 

  colorForvalue(val, levels) {
    if (val <= levels[0].value) {
      return levels[0].color;
    }
    if (val >= levels[levels.length-1].value) {
      return levels[levels.length-1].color;
    }
    for (let i = 0; i < levels.length-1; i++) {
      let bottom = levels[i];
      let top = levels[i+1];
      if (val > bottom.value && val <= top.value) {
        let percentIntoRange = (val - bottom.value) / (top.value - bottom.value);
        return blendColors(top.color, bottom.color, percentIntoRange);
      }
    }

    console.log('ERROR: val = ', val, ', but did not find color!');
    return null;
  }
  
//Render is only called when state is changed; not on map pan/zoom
  render() {
    var self = this;
    if (this.props.geohashesToDraw) {
      Promise.each(this.props.geohashesToDraw, function(geohash) {
        if (self.canvas[geohash].drawn) {
          return null;
        } 
        self.canvas[geohash].drawn = true;
        return Promise.map(self.canvas[geohash].canvases, function(cvs, idx) {
          return self.renderTile(cvs.canvas, geohash, cvs.coords, idx);
        })
      })
    }
    return super.render();
  }
})
