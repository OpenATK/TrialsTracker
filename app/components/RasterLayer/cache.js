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
  get: function(geohash, url, token, rev) {
// Get the data and compare the revs; If new, update. Else, return
    return Promise.try(function() {
      var db = new PouchDB('yield-data');
      return agent('GET', url+geohash)
      .set('Authorization', 'Bearer '+ token)
      .end()
      .then(function onResult(response) {
        // Now, save the response in the database
        var res = response.body; 
        if (res._rev === rev) {
          return false;
        } else {
//TODO: limit global cache to a particular size
          global_cache[geohash] = res;
          var doc = {jsonData: res};
          var docId = geohash;
//TODO: Fix soon-to-be deprecated db.put.
// -escape the _type key
// -give the geohash as a secondary key and map
//  the primary and secondary keys using pouchdb query
          db.put(doc, docId).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          });
          return res;
        }
      }, function onError(err) {
//        console.log(err);
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
// TODO: limit global cache to a particular size
        global_cache[geohash] = response;
        return doc.jsonData.data;
      }).catch(function(err) {
      });
    });
  }
}
