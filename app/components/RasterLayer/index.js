import { Decorator as Cerebral } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import gh from 'ngeohash';
import PouchDB from 'pouchdb';
import request from 'superagent';
import _ from 'lodash';


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
    yield: [ 'home', 'yield' ],
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
    if (!_.isEmpty(this.props.token)) {
      var ctx = canvas.getContext('2d');
      var img = ctx.createImageData(256, 256);
      var data = img.data;
      for (var j = 0; j < 256; j++) {
        for (var i = 0; i < 256; i++) {
           data[((j*256+i)*4)]   = 255; // red
           data[((j*256+i)*4)+1] = 255; // green
           data[((j*256+i)*4)+2] = 255; // blue
           data[((j*256+i)*4)+3] = 128; // alpha
        }
      } 
      ctx.putImageData(img, 0, 0);
      ctx.drawImage(canvas, 0, 0); 

      var tileSwPt = new L.Point(tilePoint.x*256, (tilePoint.y*256)+256);
      var tileNePt = new L.Point((tilePoint.x*256)+256, tilePoint.y*256);
      var sw = this.props.map.unproject(tileSwPt, zoom);
      var ne = this.props.map.unproject(tileNePt, zoom);
      var bounds = L.latLngBounds(sw, ne);
      var geohashes = gh.bboxes(sw.lat, sw.lng, ne.lat, ne.lng, 7);
    
      //TODO: Send off a request for the data.   Give a handle to this canvas 
      // so that it may be modified after the request returns data.
      const signals = this.props.signals.home;
      request
        .get('https://localhost:3000/bookmarks')
        .set('Authorization', 'Bearer '+ this.props.token.access_token)
        .end((err, res) => { signals.recievedRequestResponse({error: err, data: res, contex: ctx, canvas:canvas})});
//        .end(function(err, res){
//          () => { this.props.signals.home.handleRequestResponse({data: res})};
/*
          console.log(res);
          console.log(data);
          if (!err) { 
            for (var j = 0; j < 100; j++) {
              for (var i = 0; i < 100; i++) {
                data[((j*256+i)*4)]   = 0; // red
                data[((j*256+i)*4)+1] = 0; // green
                data[((j*256+i)*4)+2] = 0; // blue
                data[((j*256+i)*4)+3] = 128; // alpha
              }
            } 
            ctx.putImageData(img, 0, 0);
            ctx.drawImage(canvas, 0, 0); 
          }

        });

*/
      }
      //TODO: Handle the requested data. Create arrays that record the sum and count of
      //values for each pixel (if multiple points fall within a pixel).
   
      //TODO: Convert value to color.
 
  }
    
  colorForvalue(val) {
//    const raster = allMaps[this.props.selectedMap];
    const raster = this.props.raster;
    if (val == raster.nodataval) {
      return {r: 0, g: 0, b: 0, a: 0 };
    }
    const levels = raster.legend.levels;
    const numlevels = levels.length;
    if (val <= levels[0].value) {
      return levels[0].color;
    }
    if (val >= levels[numlevels-1].value) {
      return levels[numlevels-1].color;
    }
    for (let i = 0; i < numlevels-1; i++) {
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

  render() {
    return super.render();
  }
}
