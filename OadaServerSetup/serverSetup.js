var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);
var uuid = require('uuid');
var TOKEN;

var tree = {
  harvest: {
    _type: 'application/vnd.oada.harvest.1+json',
    'as-harvested': {
      _type: 'application/vnd.oada.as-harvested.1+json',
      'yield-moisture': {
        _type: 'application/vnd.oada.as-harvested.yield-moisture.1+json',
        'geohash-index': {
          'geohash-7': {
            _type: 'application/vnd.oada.data-index.geohash.1+json',
          }
        }
      },
    },
    'tiled-maps': {
       _type: 'application/vnd.oada.data-index.tiled-maps.1+json',
      'dry-yield': {
         _type: 'application/vnd.oada.data-index.tiled-map.1+json',
        'geohash-index': {
        },
      },
    },
  },
};

var _Setup = {
  putLinkedTree: function(desc, keysArray) {
    // If there are any sub-objects, put them first:
    return Promise.each(Object.keys(desc), function(key) {
      var val = desc[key];
      var newArray = [];
      keysArray.forEach(function(k) {
        newArray.push(k);
      })
      if (typeof val === 'object' && val) {
        newArray.push(key);
        return _Setup.putLinkedTree(val, newArray);
      }
    }).then(function() {
      if (!desc._type) throw {cancel: true}; // don't put non-resources
      return desc;
    }).then(function(resource) {
      resource = _Setup.replaceLinks(desc, resource);
      resource.context = {};
      for (var i = 0; i < keysArray.length-1; i++) {
        resource.context[keysArray[i]] = keysArray[i+1];
      }
      console.log('POSTING ', resource);
      return agent('POST', 'https://localhost:3000/resources/')
        .set('Authorization', 'Bearer '+ TOKEN)
        .send(resource)
        .end()
      .then(function(response) {
        var resId = response.headers.location.replace(/^\/resources\//, '');
        desc._id = resId;
        desc._rev = '0-0';
        resource._id = resId;
        resource._rev = '0-0';
        var url = 'https://localhost:3000/bookmarks/' + keysArray.join('/')
        var content = {_id: resId, _rev: '0-0'};
        console.log('PUTING ', content, ' TO URL: ', url);
        return agent('PUT', url)
          .set('Authorization', 'Bearer ' + TOKEN)
          .send({_id: resId, _rev: '0-0'})
          .end();
      });
    }).catch(function(e) {
      // Skip non-resource objects
      if(!e.cancel) {
        throw e;
      }
    })
  },
  
  replaceLinks: function(desc, example) {
    var ret = (Array.isArray(example)) ? [] : {};
    if (!desc) return example;  // no defined descriptors for this level
    Object.keys(example).forEach(function(key, idx) {
      var val = example[key];
      if (typeof val !== 'object' || !val) {
        ret[key] = val; // keep it as-is
        return;
      }
      if (val._id) { // If it's an object, and has an '_id', make it a link from descriptor

        ret[key] = { _id: desc[key]._id, _rev: '0-0' };
        return;
      }
      ret[key] = _Setup.replaceLinks(desc[key],val); // otherwise, recurse into the object looking for more links
    });
    return ret;
  },
};

module.exports = function(tok) {
  TOKEN = tok;
  return _Setup.putLinkedTree(tree, []);
}
