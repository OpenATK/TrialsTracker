import PouchDB from 'pouchdb';
import { Promise } from 'bluebird';
import uuid from 'uuid';
var agent = require('superagent-promise')(require('superagent'), Promise);

module.exports = {
  
  get: function(url, token) {
    var db = new PouchDB('TrialsTracker');
    //get resource id from url
    return db.get(url).then(function(urlRes) {
      //get resource
      return db.get(urlRes.doc).then(function(res) {
        return res.doc;
      }).catch(function(err) {
        console.log(err);
      })
    // Resource isn't in the cache. Perform an HTTP request to OADA 
    }).catch(function(err) {
      if (token) {
        return agent('GET', url)
        .set('Authorization', 'Bearer '+ token)
        .end()
        .then(function(response) {
          // save the url to resource id mapping
          var id = response.body._id;
          if (!id) id = uuid.v4();
          db.put({
            doc: id, 
            _id: url, 
//            _rev: response.body._rev
          }).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          })
          // Then, save the resource contents.
          db.put({
            doc: response.body, 
            _id: id,
//            _rev: response.body._rev
          }).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          })
          return response.body;
//        }, function onError(err) {
        }).catch(function(err) {
          console.log(err);
          if (err.status == 404) {
            return null;
          }
        })
      } else { return null;}
    })
  },
}
