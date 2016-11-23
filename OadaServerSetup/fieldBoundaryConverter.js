var toGeoJSON = require('togeojson');
var rr = require('recursive-readdir');
var fs = require('fs');
var jsdom = require('jsdom').jsdom;
var Promise = require('bluebird').Promise;
var agent = require('superagent-promise')(require('superagent'), Promise);
var uuid = require('uuid');
var TOKEN, DOMAIN, defaultFarm, defaultGrower;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var tree = {
  fields: {
    _type: 'application/vnd.oada.fields.1+json',
    growers: {},
    'fields-index': {},
  }
}

makeField = function(grower, farmName, fieldName, geometry) {
  var field = {
    _type: 'applications/vnd/oada.field.1+json',
    name: fieldName,
    context: {
      grower: {_id: grower},
      farm: {_id: farmName},
    },
    boundary: {
      geojson: geometry,
    }
  }
  return field;
}

module.exports = function(data_directory, domain, token, grower, farm) {
  TOKEN = token;
  DOMAIN = domain;
  defaultGrower = grower;
  defaultFarm = farm;
  console.log("Started import.");
  rr('./' + data_directory, function(err,files) {
    files = files.filter(function(file) {
      return (file.substr(-3) == 'kml' || file.substr(-3) == 'kmz');
    })
    return Promise.map(files, function(file) {
      console.log('Processing ' + file);
      fieldsToOadaFormat(file);
    }).then(function() {
      return putLinkedTree(tree, []);
    });
  });
}

fieldsToOadaFormat = function(file) {
  var kml = jsdom(fs.readFileSync(file, 'utf8'));
  var kmlFile = toGeoJSON.kml(kml);

  var fields = [];
  var fieldFeatures = [];
// First, get the more easily parsed farm names. 
  kmlFile.features.forEach(function(feature) {
    if (feature.properties.name.includes(' - ')) {
      var farmName = feature.properties.farm || feature.properties.name.split(' - ')[0].replace(/\s+/g, '');
      var fieldName = feature.properties.name.split(' - ')[1].replace(/\s+/g, '');
      var grower = feature.properties.grower || defaultGrower;
      var field = makeField(grower, farmName, fieldName, feature.geometry);
      tree.fields.growers[grower] = tree.fields.growers[grower] || {
        _type: 'applications/vnd/oada.grower.1+json',
        farms: {}
      };
      tree.fields.growers[grower].farms[farmName] = tree.fields.growers[grower].farms[farmName] || { 
        _type: 'applications/vnd/oada.farm.1+json',
        fields: {},
      }
      tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
      tree.fields['fields-index'][farmName] = tree.fields['fields-index'][farmName] || {
        _type: 'applications/vnd/oada.field.1+json',
        'fields-index': {},
      }
      tree.fields['fields-index'][farmName]['fields-index'][fieldName] = field;
      fields.push(field);
    } else {
      fieldFeatures.push(feature);
    }
  })

/*
// Next, if any names contain matches on existing farm names, 
  for (var i = fieldFeatures.length-1; i >= 0; i--) {
    var name = fieldFeatures[i].properties.name;
    fields.forEach(function(field) {
      if (name.indexOf(field.context.farm._id) == 0) {
        var farmName = fieldFeatures[i].properties.farm || field.context.farm._id;
        var fieldName = name.substr(farmName.length);
        var grower = fieldFeatures[i].properties.grower || defaultGrower;
        var field = makeField(grower, farmName, fieldName, fieldFeatures[i].geometry);
        tree.fields.growers[grower] = tree.fields.growers[grower] || {
          _type: 'applications/vnd/oada.grower.1+json',
          farms: {}
        };
        tree.fields.growers[grower].farms[farmName] = tree.fields.growers[grower].farms[farmName] || { 
          _type: 'applications/vnd/oada.farm.1+json',
          fields: {},
        }
        tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
        fieldFeatures.splice(i, 1);
        tree.fields['fields-index'][farmName]['fields-index'][fieldName] = field;
      }
    })
  }

// Now find if any uncategorized fields share a common first name with other remaining
// fields.  If so, make them a field.
  for (var i = fieldFeatures.length-1; i >= 0; i--) {
    var namePieces = fieldFeatures[i].properties.name.split(' ');
    for (var j = fieldFeatures.length-1; j >= 0; j--) {
      if (i == j) continue;
// Find other field names containing the first word of the field name.
      if (fieldFeatures[j].properties.name.indexOf(namePieces[0]) >= 0) {
// Add first match
        var farmName = fieldFeatures[i].properties.farm || namePieces[0];
        var fieldName = namePieces.splice(1).join(' ');
        var grower = fieldFeatures[i].properties.grower || defaultGrower;
        var field = makeField(grower, farmName, fieldName, fieldFeatures[i].geometry);
        tree.fields.growers[grower] = tree.fields.growers[grower] || {
          _type: 'applications/vnd/oada.grower.1+json',
          farms: {}
        };
        tree.fields.growers[grower].farms[farmName] = tree.fields.growers[grower].farms[farmName] || { 
          _type: 'applications/vnd/oada.farm.1+json',
          fields: {},
        }
        tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
        tree.fields['fields-index'][farmName] = tree.fields['fields-index'][farmName] || {
          _type: 'applications/vnd/oada.field.1+json',
          'fields-index': {},
        }
        tree.fields['fields-index'][farmName]['fields-index'][fieldName] = field;
// Add second match 
        var namePieces = fieldFeatures[j].properties.name.split(' ');
        if (namePieces.length > 1) {
          namePieces.splice(0,1);
          fieldName = namePieces.join(' ');
        } else {
          fieldName = fieldFeatures[j].properties.name; 
        }
        var grower = fieldFeatures[i].properties.grower || defaultGrower;
        var field = makeField(grower, farmName, fieldName, fieldFeatures[j].geometry);
        tree.fields.growers[grower] = tree.fields.growers[grower] || {
          _type: 'applications/vnd/oada.grower.1+json',
          farms: {}
        };
        tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
        tree.fields['fields-index'][farmName]['fields-index'][fieldName] = field;
        if (i > j) {
          fieldFeatures.splice(i, 1);
          fieldFeatures.splice(j, 1);
        } else {
          fieldFeatures.splice(j, 1);
          fieldFeatures.splice(i, 1);
        }
        i--;
        j--;
      }
    }
  }
*/

// Now put all remaining fields into an unknown farm.
  for (var i = fieldFeatures.length-1; i >= 0; i--) {
    var fieldName = fieldFeatures[i].properties.name.replace(/\s+/g, '');
    var farmName = fieldFeatures[i].properties.farm || defaultFarm;
    var grower = fieldFeatures[i].properties.grower || defaultGrower;
    var field = makeField(grower, farmName, fieldName, fieldFeatures[i].geometry);
    tree.fields.growers[grower] = tree.fields.growers[grower] || {
      _type: 'applications/vnd/oada.grower.1+json',
      farms: {}
    }
    tree.fields.growers[grower].farms[farmName] = tree.fields.growers[grower].farms[farmName] || { 
      _type: 'applications/vnd/oada.farm.1+json',
      fields: {},
    }
    tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
    tree.fields['fields-index'][farmName] = tree.fields['fields-index'][farmName] || {
      _type: 'applications/vnd/oada.field.1+json',
      'fields-index': {},
    }
    tree.fields['fields-index'][fieldName] = field;
  }
}

putLinkedTree = function(desc, keysArray) {
  // If there are any sub-objects, put them first:
  return Promise.map(Object.keys(desc), function(key) {
    var val = desc[key];
    var newArray = [];
    keysArray.forEach(function(k) {
      newArray.push(k);
    })
    if (typeof val === 'object' && val) {
      newArray.push(key);
      return putLinkedTree(val, newArray);
    }
  }, {concurrency: 5}).then(function() {
    if (!desc._type) throw {cancel: true}; // don't put non-resources
    return desc;
  }).then(function(resource) {
    resource = replaceLinks(desc, resource);
    resource.context = {};
    for (var i = 0; i < keysArray.length-1; i++) {
      resource.context[keysArray[i]] = keysArray[i+1];
    }
    return agent('POST', 'https://'+DOMAIN+'/resources/')
      .set('Authorization', 'Bearer '+ TOKEN)
      .send(resource)
      .end()
    .then(function(response) {
      var resId = response.headers.location.replace(/^\/resources\//, '');
      desc._id = resId;
      desc._rev = '0-0';
      var url = 'https://'+DOMAIN+'/bookmarks/' + keysArray.slice(0, keysArray.length-1).join('/');
      var content = {};
      content[keysArray[keysArray.length-1]] = {_id: resId, _rev: '0-0'}
      return agent('PUT', url)
        .set('Authorization', 'Bearer ' + TOKEN)
        .send(content)
        .end();
    });
  }).catch(function(e) {
    if(!e.cancel) {
      throw e;
    }
  })
}
  
replaceLinks = function(desc, example) {
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
    ret[key] = replaceLinks(desc[key],val); // otherwise, recurse into the object looking for more links
  });
  return ret;
}
