import PouchDB from 'pouchdb';
import { Promise } from 'bluebird';
import uuid from 'uuid';
import db from '../Pouch';
var agent = require('superagent-promise')(require('superagent'), Promise);

module.exports = {
  
  get: function(url, token) {
    //get resource id from url
    return db().get(url).then(function(urlRes) {
      //get resource
      return db().get(urlRes.doc).then(function(res) {
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
          db().put({
            doc: id, 
            _id: url, 
//            _rev: response.body._rev
          }).catch(function(err) {
            if (err.status !== 409) {
              throw err;
            }
          })
          // Then, save the resource contents.
          db().put({
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

//This was called because the given url doesn't yet exist.
  recursiveSetup: function(url, domain, token, data) {
//TODO: Get the format and create the object.

//TODO: Replace children resources with links

//Create a resource.
    var id = uuid.v4();
    data = {};
    data._id = id;
    return agent('PUT', 'https://'+domain+'/resources/'+id+'/')
    .set('Authorization', 'Bearer '+ token)
    .send(data)
    .end()
    .then(() => {
      var pieces = url.split('/');
      var parentUrl = 'https://'+domain+'/'+pieces.join('/', 0, pieces.length-2);
// Attempt to get parent.  
      return agent('GET', parentUrl)
      .set('Authorization', 'Bearer '+ token)
      .send(body)
      .end()
      .then((res) => {
// It exists. PUT to bookmarks and return the id.
        return id;

      }).catch((err) => {
        if (err.status == 404) {
          return recursiveSetup(domain, token, url, data)
          .then((response) => {
//Use the id to link to children documents
            return agent('PUT', url)
            .set('Authorization', 'Bearer '+ token)
            .send(data)
            .end()
            .then((res) => {
            
            })
          })
        }
      })
    })
  },

  put: function(domain, token, url, ) {
    //Create the resource
    var id = uuid.v4();
    data._id = id;
    return agent('PUT', 'https://'+domain+'/resources/'+id+'/')
      .set('Authorization', 'Bearer '+ token)
      .send(data)
      .end()
    .then(function(response) {

    })
    return agent('GET', url)
    .set('Authorization', 'Bearer '+ token)
    .send(body)
    .end()
    .then((res) => {
      console.log(res)
      return res;
    }).catch((err) => {
      if (err.status == 404) {
        return agent('PUT', 'https://'+domain+'/resources/'+id+'/')
        .set('Authorization', 'Bearer '+ token)
        .send(data)
        .end()
      }
    })

    var pieces = url.split('/');
    var parentUrl = 'https://'+domain+'/'+pieces.join('/', 0, pieces.length-2);
    return recursiveSetup(domain, token, parentUrl, data)
    .then(() => {
      
    })
  },
}
