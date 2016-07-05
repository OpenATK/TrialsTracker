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
  get: function(geohash, token, rev) {
    var url = 'https://localhost:3000/bookmarks/harvest/as-harvested/maps/wet-yield/geohash-'+geohash.length+'/';
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

  // Get cached data to load a tile with some content immediately
  tryGet: function(geohash) {
    return Promise.try(function() {
      var db = new PouchDB('yield-data');
// 1. Attempt to retrieve from global cache in memory
      if (global_cache[geohash]) 
        return global_cache[geohash];
// 2. Attempt to retrieve from Pouch cache (not in memory)
      return db.get(geohash)
      .then(function(doc) {
        global_cache[geohash] = doc.doc;
        return doc.doc;
      }).catch(function(err) {
//        console.log(err);
      });
    });
  }
}
