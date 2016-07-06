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
// Get the data and compare the revs; If new, update. Else, return
/*
  get: function(geohash, token, rev) {
    return Promise.try(function() {
      var db = new PouchDB('yield-data');
      return agent('GET', url+geohash)
      .set('Authorization', 'Bearer '+ token)
      .end()
      .then(function onResult(response) {
        global_cache[geohash] = response.body;
        db.put({doc:response.body, _id: geohash, _rev: response.body._rev}).catch(function(err) {
          if (err.status !== 409) {
            throw err;
          }
        });
        return response.body;
      }, function onError(err) {
        console.log(err);
        return false;
      });
    });
  },
*/

  // Get cached data to load a tile with some content immediately
  get: function(geohash, token, rev) {
//    return Promise.try(function() {
     /* 
      if (global_cache[geohash]) {
        console.log('in global cache');
        return global_cache[geohash];
      }
*/
      var db = new PouchDB('yield-data');
      return db.get(geohash).then(function(result) {
        console.log('Geohash data in cache. Drawing...');
        console.log(result);
        return result.doc;
      }).catch(function(err) {
//        console.log(err);
        console.log('getting from server');
        var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-'+geohash.length+'/';
        return agent('GET', url+geohash)
        .set('Authorization', 'Bearer '+ token)
        .end()
        .then(function onResult(response) {
          console.log('Got geohash data from the server. Drawing...');
          console.log(response);
//          global_cache[geohash] = response.body;
          db.put({
            doc:response.body, 
            _id: geohash, 
            _rev: response.body._rev
          }).then(function(response) {
            console.log('success');
          }).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          });
          return response.body;
        }, function onError(err) {
          console.log('errored');
          //console.log('on error');
        });
      });
 //   });
  }
}
