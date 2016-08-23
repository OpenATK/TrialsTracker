import React from 'react';
import { connect } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
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
import ld from 'leaflet-draw';
import Color from 'color';

function blendColors(c1, c2, percent) {
  let a1 = (typeof c1.a === 'undefined') ? 255 : c1.a; // Defualt opaque
  let a2 = (typeof c1.b === 'undefined') ? 255 : c1.b;
  return { 
    r: c1.r * percent + c2.r * (1-percent),
    g: c1.g * percent + c2.g * (1-percent),
    b: c1.b * percent + c2.b * (1-percent),
    a: 255,
//    a:   a1 * percent +   a2 * (1-percent),
  };
}

export default connect({
  selectedMap: 'app.model.selected_map',
  availableGeohashes: 'app.model.available_geohashes',
  currentGeohashes: 'app.model.current_geohashes',
  liveData: 'app.live_data',
  token: 'app.token.access_token',
  legends: 'app.view.legends',
}, {
  tileUnloaded: 'app.tileUnloaded',
  geohashDrawn: 'app.geohashDrawn',
  newTileDrawn: 'app.newTileDrawn',
},

  class RasterLayer extends CanvasTileLayer {
  
    constructor(props) {
      super(props)  
    }  
  
    componentWillMount() {
      db = new PouchDB('yield-data');
      super.componentWillMount();
      this.leafletElement.drawTile = this.drawTile.bind(this);
      this.renderTile = this.renderTile.bind(this);
      this.tileUnload = this.tileUnload.bind(this);
      this.validate = this.validate.bind(this);
      this.recursiveDrawOnCanvas = this.recursiveDrawOnCanvas.bind(this);
      this.handleGeohashData = this.handleGeohashData.bind(this);
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
        this.props.tileUnloaded({geohashesToRemove});
      }
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
        var precision =  this.getGeohashLevel(zoom, sw, ne);
        var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision);
        var geohashesGrids = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, precision+2);
        if (this.props.geohashGridlines) this.drawGeohashGrid(canvas, tilePoint, zoom, geohashesGrids, 'black', 1);
        if (this.props.tileGridlines) this.drawTileGrid(canvas, tilePoint, zoom);
        for (var g = geohashes.length-1; g > -1; g--) {
  /*
        var ghbbox = gh.decode_bbox(geohashes[g]);
        var gse = L.latLng(ghbbox[0], ghbbox[3]);
        var gsw = L.latLng(ghbbox[0], ghbbox[1]);
        var gnw = L.latLng(ghbbox[2], ghbbox[1]);
        var gne = L.latLng(ghbbox[2], ghbbox[3]);
        var area = L.GeometryUtil.geodesicArea([gsw,gse,gne,gnw]);
        console.log(geohashes[g] + ' area: '+area)
  */
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
          return this.props.newTileDrawn({geohashes});
        }
      });
    }
  
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
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(w + 0.5, n + 0.5, e - w - 0.5, s - n - 0.5);
        ctx.closePath();
        ctx.stroke();
        this.leafletElement.tileDrawn(canvas);
      }   
    }
  
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
  /*//This code handles checking for new revs on the server
                if (self.props.availableGeohashes[geohash]._rev !== result._rev) {
                  console.log(self.props.availableGeohashes[geohash]);
                  console.log(self.props.availableGeohashes[geohash]._rev, result._rev);
                  const cache_result = cache.get(geohash, self.props.token, self.props.currentGeohashes[geohash]);
                  cache_result.then(function(result) {
                    if (result) {
                      console.log('New geohash data on the server. Redrawing...');
                      self.handleGeohashData(canvas, result.aggregates, tilePoint);
                    }
                  });     
                }
  */
   
 // This function gets the geohash data and begins the rendering 
    renderTile(canvas, geohash, tilePoint, index) {
      var zoom = this.props.map.getZoom();
      if (this.props.token) {
        var self = this;
        return Promise.try(function() {
          return cache.get(geohash, self.props.token)
          .then(function(data) {
  //After coming back from the cache, detect whether the canvas is still current.
            if (!self.canvas[geohash]) {
              console.log('cancelled a render1');
              return null;
            }
            if (!self.canvas[geohash].canvases[index]) {
              console.log('cancelled a render2');
              return null;
            }
            if (self.canvas[geohash].canvases[index].tilePoint != tilePoint) {
              console.log('cancelled a render3');
              return null;
            }
            if (zoom >= 16) {
              console.log('using geohash-'+geohash.length+ ' raw data');
              return self.handleGeohashData(canvas, data.data, tilePoint, geohash)
              return null;
            } else {
              console.log('using geohash-'+geohash.length+ ' aggregate');
              return self.handleGeohashData(canvas, data.aggregates, tilePoint, geohash)
              return null;
            }
          });
        });
      }
    }
 
// For the returned geohash data (points or aggregates), this function calls the appropriate recursive draw function 
    handleGeohashData(canvas, data, tilePoint, geohash) {
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
  
        if (zoom >= 16) {
          return self.recursiveDrawOnCanvasRawData(imgData, tilePoint, bounds, data, 0, canvas, ctx);
        } else {
          return self.recursiveDrawOnCanvas(imgData, tilePoint, bounds, data, 0, canvas, ctx);
        }
      }).then(function() {
        // Grid lines must be drawn on top using the same canvas as the yield data.
        var bbox = gh.decode_bbox(geohash);
        var geohashesGrids = gh.bboxes(bbox[0], bbox[1], bbox[2], bbox[3], geohash.length+2);
        if (self.props.geohashGridlines) self.drawGeohashGrid(canvas, tilePoint, zoom, geohashesGrids, 'black', 1);
        if (self.props.tileGridlines) self.drawTileGrid(canvas, tilePoint, zoom);
      });
    }
  
    getGeohashLevel(zoom, sw, ne) { 
      if (zoom >= 15) return 7;
      if (zoom >= 12) return 6;
      if (zoom >= 8) return 5;
      if (zoom >= 6) return 4;
      if (zoom <= 5) return 3;
    }
  
    getPixelWidth(zoom) {
      switch(zoom) {
        case 17: return 3;
        case 16: return 2;
        case 15: return 1;
        case 14: return 1;
        case 13: return 1;
        case 12: return 1;
        case 11: return 1;
        case 10: return 0;
        case 9: return 0;
        case 8: return 0;
        case 7: return 0;
        case 6: return 0;
        case 5: return 0;
        case 4: return 0;
        case 3: return 0;
        case 2: return 0;
        case 1: return 0;
        case 0: return 0;
      }
    }
  
// This function recursively draws 100 yield data points
    recursiveDrawOnCanvas(imageData, tilePoint, bounds, data, startIndex, canvas, context) {
      var zoom = this.props.map.getZoom();
      var keys = Object.keys(data);
      var self = this;
      var stopIndex = (keys.length < startIndex+100) ? keys.length : startIndex+100;
      return Promise.try(function() {
        var pixelData = imageData.data;
        for (var i = startIndex; i < stopIndex; i++) {
          var val = data[keys[i]];
          var n = 0;
          var cropTypes = Object.keys(val.stats);
          for (var j = 0; j < cropTypes.length; j++) {
            if (val.stats[cropTypes[j]].n > n) {
              n = val.stats[cropTypes[j]].n;
            } else { continue; }
            var latlng = L.latLng(val.location.lat, val.location.lon);
            if (bounds.contains(latlng)) {
              var levels = self.props.legends[cropTypes[j]];
              var ghBounds = gh.decode_bbox(keys[i]); 
              var nw = self.props.map.project(new L.latLng(ghBounds[2], ghBounds[1]), zoom);
              var se = self.props.map.project(new L.latLng(ghBounds[0], ghBounds[3]), zoom);
              var w = nw.x - tilePoint.x*256;
              var n = nw.y - tilePoint.y*256;
              var e = se.x - tilePoint.x*256;
              var s = se.y - tilePoint.y*256;
  //Fill the entire geohash aggregate with the appropriate color
              context.lineWidth = 0;
              console.log(val);
              console.log(val.stats[cropTypes[j]]);
              var col = self.colorForvalue(val.stats[cropTypes[j]].mean_yield, levels);
              col = Color(col);
              col = col.hexString();
              console.log(col);
              context.beginPath();
              context.rect(w + 0.5, n + 0.5, e - w - 0.5, s - n - 0.5);
 
//              context.fillStyle='rgba('+col.r+','+col.g+','+col.b+')'; //doesn't work for some reason...Only produces red and green, no mixing
              context.fillStyle = col;
              context.fill();
//              context.lineWidth = 0;
//              context.strokeStyle = 'black';
//              context.stroke();
            }
          }
        }
  
  //      context.putImageData(imageData, 0, 0);
        return self.leafletElement.tileDrawn(canvas);
      }).then(function() {
        if (stopIndex != keys.length) {
          return self.recursiveDrawOnCanvas(imageData, tilePoint, bounds, data, stopIndex, canvas, context);
        }
      });
    }
  
   recursiveDrawOnCanvasRawData(imageData, tilePoint, bounds, data, startIndex, canvas, context) {
      var zoom = this.props.map.getZoom();
      var keys = Object.keys(data);
      var self = this;
      var stopIndex = (keys.length < startIndex+100) ? keys.length : startIndex+100;
      return Promise.try(function() {
        var pixelData = imageData.data;
        for (var i = startIndex; i < stopIndex; i++) {
          var val = data[keys[i]];
          var latlng = L.latLng(val.location.lat, val.location.lon);
          if (bounds.contains(latlng)) {
            var levels = self.props.legends[val.crop_type];
            var pt = self.props.map.project(latlng);
            pt.x = Math.floor(pt.x - tilePoint.x*256);
            pt.y = Math.floor(pt.y - tilePoint.y*256);
            var color = self.colorForvalue(val.bushels/val.area, levels);
  //          var pixWidth = 0;
            var pixWidth = self.getPixelWidth(zoom);
            for (var m = 0-pixWidth; m < 1+pixWidth; m++) {
              for (var n = 0-pixWidth; n < 1+pixWidth; n++) {
                pixelData[(((pt.y+n)*256+pt.x+m)*4)]   = color.r; // red
                pixelData[(((pt.y+n)*256+pt.x+m)*4)+1] = color.g; // green
                pixelData[(((pt.y+n)*256+pt.x+m)*4)+2] = color.b; // blue
                pixelData[(((pt.y+n)*256+pt.x+m)*4)+3] = 255; // alpha
              }
            }
          }
        }
        context.putImageData(imageData, 0, 0);
        return self.leafletElement.tileDrawn(canvas);
      }).then(function() {
        if (stopIndex != keys.length) {
          return self.recursiveDrawOnCanvasRawData(imageData, tilePoint, bounds, data, stopIndex, canvas, context);
        }
      });
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
  
    validate(geohash) {
      return (this.props.currentGeohashes[geohash] !== this.props.availableGeohashes[geohash]._rev);
    }
 
// TODO: remember why this is necessary... 
    updateCanvas() {
      Object.keys(this.canvas).forEach((geohash) => {
        if (!this.props.availableGeohashes[geohash]) delete this.canvas[geohash];
      });
    }
  
    render() {
      var self = this;
      console.log(this.props.map.getZoom());
      if (Object.keys(this.props.availableGeohashes).length > 0) {
        this.updateCanvas();
        var geohashes = Object.keys(this.canvas);
        Promise.map(geohashes, function(geohash) {
          if (self.canvas[geohash].drawn) {
            return null;
          } else {
            self.canvas[geohash].drawn = true;
            return Promise.map(self.canvas[geohash].canvases, function(cvs, idx) {
              return self.renderTile(cvs.canvas, geohash, cvs.tilePoint, idx);
            }).then(function() {
              console.log('finished rendering geohash', geohash);
            });
          }
        }).then(function() {
          console.log('finished drawing canvases promise.map');
        //  TODO check whether any geohashes were actually drawn
          self.props.geohashDrawn({geohashes});
        });
      }
      return super.render();
    }
  }
)
