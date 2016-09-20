var _ = require('lodash');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var agent = require('superagent-promise')(require('superagent'), Promise);
var rawData = {};
var tiledMaps = {};
var tradeMoisture = {
  Soybeans:  13,
  Corn: 15,
  Wheat: 13,
};
var Promise = require('bluebird');
var agent = require('superagent-promise')(require('superagent'), Promise);
var uuid = require('uuid');
var TOKEN;

var tree = {
  harvest: {
    _type: 'application/vnd.oada.harvest.1+json',
    'as-harvested': {
      _type: 'application/vnd.oada.as-harvested.1+json',
      'yield-moisture-dataset': {
        _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
        'crop-index': {}
      },
    },
    'tiled-maps': {
       _type: 'application/vnd.oada.data-index.tiled-maps.1+json',
      'dry-yield-map': {
         _type: 'application/vnd.oada.data-index.tiled-map.1+json',
        'crop-index': {},
      },
    },
  },
};

module.exports = function(yield_data_directory, token) {
  TOKEN = token;
  console.log("Started import.");
  rr('./' + yield_data_directory, function(err,files) {
    //for (var i = 0; i < files.length; i++) {
    return Promise.map(files, function(file) {
      if ((file).substr(-3) == 'csv') {
        console.log('Processing ' + file);
        var options = { delimiter : ','};
        var data = fs.readFileSync(file, { encoding : 'utf8'});
        var jsonCsvData = csvjson.toObject(data, options);
        return this.processData(jsonCsvData, file);
      } else {
        return null;
      }
    }).then(function() {
      console.log('done raw data');
      return this.createAggregates([2, 3, 4, 5, 6, 7]);
    }).then(function() {
      console.log(tree);
      return _Setup.putLinkedTree(tree, []);
    });
  });
}

processData = function(csvJson, filename) {
  var geohash;
  // First check that all the keys are matched
  if (!('Yield Vol(Wet)(bu/ac)' in csvJson[1])) {
    if ((!'Estimated Volume (Wet)(bu/ac)' in csvJson[1])) {
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Yield Vol (Wet)(bu/ac)" nor "Estimated Volume (Wet)(bu/ac)"');
    }
  }
  if (!('Product - Name' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Product - Name" key does not exist')
  }
  if (!('Latitude' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Latitude" key does not exist')
  }
  if (!('Longitude' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Longitude" key does not exist');
  }
  if (!('Elevation(ft)' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Elevation(ft)" key does not exist')
  }
  if (!('Speed(mph)' in csvJson[1])) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Speed(mph)" key does not exist');
  }
  if (!('Swath Width(ft)' in csvJson[1])) { 
    if (!('Swth Wdth(ft)' in csvJson[1])) { 
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Swath Width(ft)" nor "Swth Wdth(ft)"');
    }
  }
  if (!('Field - Name' in csvJson[1])) { 
    if (!('Field' in csvJson[1])) { 
      console.log('!!!!!!!!Warning!!!!!!!');
      console.log('Keys do not exist for "Field - Name" nor "Field"');
    }
  } 

//  for (var i = 0; i < csvJson.length; i++) {
  return Promise.map(csvJson, function(row, i) {
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    var cropType = csvJson[i]['Product - Name'];
    cropType = cropType.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

    //Handle new crop types
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType] = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType] || {
      _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.crop.1+json',
      'geohash-index': {
        'geohash-7': {
          _type: 'application/vnd.oada.data-index.geohash.1+json',
          geohashes: {},
        },
      },
    };
    //Handle new geohashes
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash] = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash] || {
      data: { },
    };
 
    var template_id;
    if (!tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].templates) { 
      template_id = uuid.v4();
      tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].templates = {};
      tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].templates[id] = {
        area: { units: 'acres' },
        weight: { units: 'bushels' },
        yield: { units: 'bu/ac' },
        moisture: { units: '%H2O' },
        location: { datum: 'WGS84' },
      }
    } else { 
      template_id = Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].templates)[0];
    }

    // Add the data point
    var id = uuid.v4();
    var pt = {
      id: id,
      template: template_id,
      moisture: csvJson[i]['Moisture(%)'],
      location: {
        lat: csvJson[i].Latitude,
        lon: csvJson[i].Longitude,
        alt: csvJson[i]['Elevation(ft)'],
      },
    };

    var val = +csvJson[i]['Estimated Volume (Wet)(bu/ac)'];
    if (!val) val = +csvJson[i]['Yld Vol(Wet)(bu/ac)'];
    if (csvJson[i]['Swath Width(ft)']) {
      pt.area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swath Width(ft)']/43560.0;
    } else {
      pt.area = (csvJson[i]['Speed(mph)']*5280/3600)*csvJson[i]['Swth Wdth(ft)']/43560.0;
    }
    pt.weight = val*pt.area;

    if (isNaN(pt.weight)) {
      console.log('````````````NEW ONE``````````');
      console.log(val);
      console.log(csvJson[i]['Speed(mph)']);
      console.log(csvJson[i]['Swath Width(ft)']);
      console.log(pt.area);
      console.log(pt.weight);
    }
    //push the point
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].data[id] = pt;
    return tree;
  });
}

createAggregates = function(levels) {
  var i = 1;
  console.log(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index']);
  return Promise.map(Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index']), function(cropType) {
//    return Promise.each(Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes), function(geohash) {
//      return Promise.each(Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].data), function(key) {
   Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes).forEach(function(geohash) {
      Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].data).forEach(function(key) {
        var pt = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-index']['geohash-7'].geohashes[geohash].data[key];
        levels.forEach((level) => {
          var weight = pt.weight;
          if (pt.moisture > tradeMoisture.cropType) {
            weight = weight*(100-pt.moisture)/(100-tradeMoisture.cropType);// Adjust weight for moisture content
          }
          var cropType = pt.crop_type;
          var ghlen = 'geohash-'+level;
          var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
          var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
          var loc = gh.decode(aggregateGh);
          if (isNaN(pt.weight)) {
            console.log(pt);
          }
          additionalStats = {
            count: 1,
            weight: {
              sum: weight,
              'sum-of-squares': Math.pow(weight, 2)
            },
            area: {
              sum: pt.area,
              'sum-of-squares': Math.pow(pt.area, 2)
            }
          };

          //Handle new crop types
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType] || {
            _type: 'application/vnd.oada.tiled-maps.dry-yield-map.crop.1+json',
            'geohash-index': {},
          };
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen] || {
            _type: 'application/vnd.oada.data-index.geohash.1+json',
            geohashes: {},
          }
          //Handle new geohashes
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh] || {
            stats: {},
            datum: 'WGS84',
            templates: {},
            'geohash-data': {},
          };
 
          var template_id;
          if (!tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh].templates) { 
            template_id = uuid.v4();
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh].templates = {};
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh].templates[id] = {
              area: { units: 'acres' },
              weight: { units: 'bushels' },
              moisture: { 
                units: '%H2O',
                value: tradeMoisture.cropType 
              },
              location: { datum: 'WGS84' },
            }
          } else { 
            template_id = Object.keys(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh].templates)[0];
          }
        
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh].stats = 
            recomputeStats(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh], additionalStats);
        
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh]['geohash-data'].aggregateGh = 
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh]['geohash-data'].aggregateGh || {
              template: template_id,
            };

          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh]['geohash-data'].aggregateGh = 
            recomputeStats(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-index'][ghlen].geohashes[bucketGh]['geohash-data'].aggregateGh, additionalStats);

          return tree;
        });
      });
    });
  });
};

recomputeStats = function(curStats, additionalStats) {
  if (isNaN(curStats.area)) {
    return additionalStats;
  }
  curStats.count = curStats.count + additionalStats.count;
  curStats.area.sum = curStats.area.sum + additionalStats.area.sum;
  curStats.area['sum-of-squares'] = curStats.area['sum-of-squares'] + additionalStats.area['sum-of-squares'];
  curStats.weight.sum = curStats.weight.sum + additionalStats.weight.sum;
  curStats.weight['sum-of-squares'] = curStats.weight['sum-of-squares'] + additionalStats.weight['sum-of-squares'];
  return curStats;
};

var _Setup = {
  putLinkedTree: function(desc, keysArray) {
    // If there are any sub-objects, put them first:
    return Promise.map(Object.keys(desc), function(key) {
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
      console.log('POSTed ', resource);
      return agent('POST', 'https://localhost:3000/resources/')
        .set('Authorization', 'Bearer '+ TOKEN)
        .send(resource)
        .end()
      .then(function(response) {
        var resId = response.headers.location.replace(/^\/resources\//, '');
        desc._id = resId;
        desc._rev = '0-0';
        var url = 'https://localhost:3000/bookmarks/' + keysArray.slice(0, keysArray.length-1).join('/');
        var content = {};
        content[keysArray[keysArray.length-1]] = {_id: resId, _rev: '0-0'}
        console.log('PUT ', content, ' to url: ', url);
        return agent('PUT', url)
          .set('Authorization', 'Bearer ' + TOKEN)
          .send(content)
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


