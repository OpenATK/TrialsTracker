import { Decorator as Cerebral } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import gh from 'ngeohash';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import { Promise } from 'bluebird';
var agent = require('superagent-promise')(require('superagent'), Promise);
var global_cache = {};

module.exports = {
  // Get cached data to load a tile with some content immediately
  get: function(geohash, token) {
    var db = new PouchDB('yield-data');
    return db.get(geohash).then(function(result) {
      console.log('got '+geohash+' from cache');
      return result.doc;
    }).catch(function(err) {
//      console.log('cache.get pouch db.get error');
//      console.log(err);
      var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-'+geohash.length+'/';
      return agent('GET', url+geohash)
      .set('Authorization', 'Bearer '+ token)
      .end()
      .then(function onResult(response) {
        console.log('got '+geohash+' from server');
        db.put({
          doc:response.body, 
          _id: geohash, 
//          _rev: response.body._rev
        }).then(function(res) {
        }).catch(function(err) {
//          console.log(err);
          if (err.status !== 409) {
            throw err;
          }
        });
        
        return response.body;
      }, function onError(err) {
//        console.log('cache.get onError. Data simply wasn't in pouch cache yet.');
//        console.log(err);
      });
    });
  }
}
