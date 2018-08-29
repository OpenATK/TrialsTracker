var toGeoJSON = require('togeojson');
var rr = require('recursive-readdir');
var fs = require('fs');
var jsdom = require('jsdom').jsdom;
var axios = require('axios');
var Promise = require('bluebird').Promise;
var DOMParser = require('xmldom').DOMParser;
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

module.exports = function(data_directory, domain, token, grower, farm) {
  TOKEN = token;
  DOMAIN = domain;
  defaultGrower = grower;
  defaultFarm = farm;
  console.log("Started import.");
	rr('./' + data_directory, (err,files) => {
		files = files.filter((file) => {
      return (file.substr(-3) == 'kml' || file.substr(-3) == 'kmz');
    })
		return Promise.map(files, (file) => {
      console.log('Processing ' + file);
      fieldsToOadaFormat(file);
		}).then(() => {
      return Promise.map(Object.keys(tree), (key) => {
				return putLinkedTree(tree[key], key).then((res) => {
					console.log(res)
          let pathString = '/bookmarks/'+key
          return axios({
            method: 'put',
             url: 'https://'+DOMAIN+pathString,
            headers: {
              'Authorization': 'Bearer ' + TOKEN,
              'Content-Type': tree[key]._type
            },
            data: res,
          })
        })
      })
    });
  });
}

fieldsToOadaFormat = function(file) {
  var kml = new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'));
  var kmlFile = toGeoJSON.kml(kml);

  var fields = [];
  var fieldFeatures = [];
// First, get the more easily parsed farm names. 
	kmlFile.features.forEach((feature) => {

		//    if (feature.properties.name.includes(' - ')) {
		var splitName = feature.properties.name.split(' - ');
		var fieldName = splitName.length > 1 ? splitName[1].replace(/\s+/g, '') : splitName[0].replace(/\s+/g, '');
		var farmName = splitName.length > 1 ? splitName[0].replace(/\s+/g, '') : defaultFarm;
    var grower = feature.properties.grower || defaultGrower;
    var field = {
      _type: 'application/vnd.oada.field.1+json',
      name: fieldName,
      context: {
        grower: {_id: grower},
        farm: {_id: farmName},
      },
      boundary: {
        geojson: feature.geometry,
      }
    }
    tree.fields.growers[grower] = tree.fields.growers[grower] || {
      _type: 'application/vnd.oada.grower.1+json',
      farms: {}
    };
    tree.fields.growers[grower].farms[farmName] = tree.fields.growers[grower].farms[farmName] || { 
      _type: 'application/vnd.oada.farm.1+json',
      fields: {},
    }
    tree.fields.growers[grower].farms[farmName].fields[fieldName] = field;
    tree.fields['fields-index'][farmName] = tree.fields['fields-index'][farmName] || {
      _type: 'application/vnd.oada.field.1+json',
      'fields-index': {},
    }
    tree.fields['fields-index'][farmName]['fields-index'][fieldName] = field;
    fields.push(field);
  })
}

putLinkedTree = function(dataTree, pathString) {
	console.log(pathString)
  return Promise.each(Object.keys(dataTree), (key) => {
    if (typeof dataTree[key] === 'object' && dataTree[key]) {
      return putLinkedTree(dataTree[key], pathString+'/'+key).then((res) => {
        return dataTree[key] = res;
      })
    } else return dataTree[key] = dataTree[key];
  }, {concurrency: 5}).then((results) => {
		if (dataTree._type) {
			console.log('GONNA POST TO ', 'https://'+DOMAIN+'/resources/')
      return axios({
        method:'post', 
        url:'https://'+DOMAIN+'/resources/',
        headers: {
           'Authorization': 'Bearer '+ TOKEN,
           'Content-Type': dataTree._type,
        },
        data: dataTree,
      }).then((response) => {
        var resId = response.headers.location.replace(/^\/resources\//, '');
        console.log('RETURNING', pathString, dataTree);
        return {_id: 'resources/'+resId, _rev: '0-0'};
      })
    } else {
      return dataTree
    }
  }).catch((e) => {
    if(!e.cancel) {
      throw e;
    }
  })
}
