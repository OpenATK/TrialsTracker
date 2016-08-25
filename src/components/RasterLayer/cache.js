import { CanvasTileLayer, Point } from 'react-leaflet';
import React from 'react';
import styles from './style.css';
import PouchDB from 'pouchdb';
import { Promise } from 'bluebird';
var agent = require('superagent-promise')(require('superagent'), Promise);
var global_cache = {};

module.exports = {
  get: function(resId, url, token) {
    var db = new PouchDB('yield-data');
    return db.get(resId).then(function(result) {
//      console.log('got '+resId+' from CACHE');
      return result.doc;
    }).catch(function(err) {
//      console.log(err);
      if (token) {
        return agent('GET', url+resId)
        .set('Authorization', 'Bearer '+ token)
        .end()
//        .then(function onResult(response) {
        .then(function(response) {
//          console.log('got '+resId+' from SERVER');
          db.put({
            doc:response.body, 
            _id: resId, 
//            _rev: response.body._rev
          }).then(function(res) {
          }).catch(function(err) {
            if (err.status !== 409) {
              console.log('throwing');
              throw err;
            }
          });
          return response.body;
//        }, function onError(err) {
        }).catch(function(err) {
          console.log(err);
          if (err.status == 404) {
            return null;
          }
        });
      } else { return null;}
    });
  }
}
