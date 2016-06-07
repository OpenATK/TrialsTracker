import { Decorator as Cerebral } from 'cerebral-view-react';
import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import gh from 'ngeohash';
//import request from 'superagent';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import bair from './Bair100.js';
import md5 from 'md5';
import { Promise } from 'bluebird';
var agent = require('superagent-promise')(require('superagent'), Promise);
var global_cache = {};
/*
  for (var g = 0; g < geohashes.length; g++) {
    var rawData = bair[geohashes[g]];
    var hash = md5(JSON.stringify(rawData));
    if (!_.isEqual(hash, this.props.yieldHashes[geohashes[g]])) {
    }
  }
*/
module.exports = {
  get: function(geohash, url, token) {
    var db = new PouchDB('yield-data');
    return Promise.try(function() {
      // 1. Attempt to retrieve from global cache in memory
      if (global_cache[geohash]) 
        return global_cache[geohash];
      // 2. Attempt to retrieve from Pouch cache (not in memory)
      console.log('not in global cache');
      return db.get(geohash)
      .then(function(doc) {
        return doc.jsonData.data;
      // 3. Attempt to retrieve from the server
      }).catch(function(err) {
        console.log('not in pouch');
//        console.log(geohash+' not in cache. Requesting from ' + url);
        console.log('Requesting ' + url + geohash);
        return agent('GET', url+geohash)
        .set('Authorization', 'Bearer '+ token)
        .end()
        .then(function onResult(response) {
//          console.log('Got the data for geohash ' + geohash +'.');
          // Now, save the response in the database
          global_cache[geohash] = response;
          var doc = {jsonData: response};
          var docId = geohash;
          db.put(doc, docId).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          });
          return JSON.parse(response.text);
        }, function onError(err) {
//          console.log(err);
        });
      });
    });
  }
}
