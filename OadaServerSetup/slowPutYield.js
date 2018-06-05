var _ = require('lodash');
var urlLib = require('url');
var csvjson = require('csvjson');
var uuid = require('uuid');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird').Promise;
var axios = require('axios');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var rawData = {};
var tiledMaps = {};
var tradeMoisture = {
  soybeans:  13,
  corn: 15,
  wheat: 13,
};
var Promise = require('bluebird');
var uuid = require('uuid');
var TOKEN;
var DOMAIN;

var tree = {
  harvest: {
		_type: 'application/vnd.oada.harvest.1+json',
		_rev: '0-0',
		_id: 'resources/'+uuid(),
    'as-harvested': {
      _type: 'application/vnd.oada.as-harvested.1+json',
			_rev: '0-0',
			_id: 'resources/'+uuid(),
      'yield-moisture-dataset': {
        _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
				_rev: '0-0',
				_id: 'resources/'+uuid(),
        'crop-index': {}
      },
    },
    'tiled-maps': {
      _type: 'application/vnd.oada.data-index.tiled-maps.1+json',
			_rev: '0-0',
			_id: 'resources/'+uuid(),
      'dry-yield-map': {
        _type: 'application/vnd.oada.data-index.tiled-maps.1+json',
				_rev: '0-0',
				_id: 'resources/'+uuid(),
        'crop-index': {},
      },
    },
  },
};

module.exports = function(yield_data_directory, domain, token) {
  TOKEN = token;
  DOMAIN = domain;
  console.log(TOKEN, DOMAIN)
  rr('./' + yield_data_directory, (err,files) => {
    files = files.filter((file) => {
      return (file.substr(-3) === 'csv');
    })
    return Promise.each(files, (file) => {
      console.log('Processing ' + file);
      var options = { delimiter : ','};
      var data = fs.readFileSync(file, { encoding : 'utf8'});
      var jsonCsvData = csvjson.toObject(data, options);
      return this.processRawData(jsonCsvData, file);
    }).then(() => {
      return this.createAggregates([1, 2, 3, 4, 5, 6, 7]);
    }).then(() => {
			return this.putLinkedTree(tree, 'https://'+DOMAIN+'/bookmarks')
    })
  })
}

processRawData = function(csvJson, filename) {
  var geohash;
  // First check that all the keys are matched
  if (!csvJson[0]['Yield Vol(Wet)(bu/ac)'] && !csvJson[0]['Estimated Volume (Wet)(bu/ac)']) {
    console.log(`Headers weren't found matching either "Yield Vol (Wet)(bu/ac)" or "Estimated Volume (Wet)(bu/ac)"`);
  }
  if (!csvJson[1]['Product - Name']) {
    console.log('!!!!!!!!Warning!!!!!!!');
    console.log('"Product - Name" key does not exist')
  }
  if (!csvJson[1]['Latitude']) {
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

  return Promise.map(csvJson, (row, i) => {
    geohash = gh.encode(csvJson[i].Latitude, csvJson[i].Longitude, 7);
    var cropType = csvJson[i]['Product - Name'] || csvJson[i]['Product'];
    cropType = cropType.replace(/\w\S*/g, txt => txt.toLowerCase());

    //Handle new crop types
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType] = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType] || {
      _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
			_id: 'resources/'+uuid(),
			_rev: '0-0',
      'geohash-length-index': {
        'geohash-7': {
         'geohash-index': {},
        },
      },
    };
    //Handle new geohashes
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash] = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash] || {
			_rev: '0-0',
      _type: 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
			_id: 'resources/'+uuid(),
      data: { },
    };
 
    var template_id;
    if (!tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].templates) { 
      template_id = uuid.v4();
      tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].templates = {};
      tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].templates[template_id] = {
        area: { units: 'acres' },
        weight: { units: 'bushels' },
        yield: { units: 'bu/ac' },
        moisture: { units: '%H2O' },
        location: { datum: 'WGS84' },
      }
    } else { 
      template_id = Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].templates)[0];
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
    tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].data[id] = pt;
    return tree;
  }, {concurrency: 1});
}

createAggregates = function(levels) {
  var i = 1;
  return Promise.map(Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index']), (cropType) => {
    Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index']).forEach((geohash) => {
      Object.keys(tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].data).forEach((key) => {
        var pt = tree.harvest['as-harvested']['yield-moisture-dataset']['crop-index'][cropType]['geohash-length-index']['geohash-7']['geohash-index'][geohash].data[key];
        levels.forEach((level) => {
          var weight = pt.weight;
          if (pt.moisture > tradeMoisture[cropType]) {
            weight = weight*(100-pt.moisture)/(100-tradeMoisture[cropType]);// Adjust weight for moisture content
          }
          var ghlen = 'geohash-'+(level);
          var bucketGh = gh.encode(pt.location.lat, pt.location.lon, level);
          var aggregateGh = gh.encode(pt.location.lat, pt.location.lon, level+2);
          if (isNaN(pt.weight)) {
            console.log(pt);
          }
          additionalStats = {
            count: 1,
            weight: {
              sum: weight,
              'sum-of-squares': Math.pow(weight, 2),
						},
						'yield-squared-area': Math.pow(weight/pt.area, 2)*pt.area,
            area: {
              sum: pt.area,
              'sum-of-squares': Math.pow(pt.area, 2)
						},
						'sum-yield-squared-area': Math.pow(weight/pt.area, 2)*pt.area,
					};
          //Handle new crop types
					tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType] || {
						_rev: '0-0',
            _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
						_id: 'resources/'+uuid(),
            'geohash-length-index': {},
          };
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen] || {
						_rev: '0-0',
						_id: 'resources/'+uuid(),
						'geohash-index': {},
          }
          //Handle new geohashes
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh] = tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh] || {
            _type: 'application/vnd.oada.tiled-maps.dry-yield-map.1+json',
						_id: 'resources/'+uuid(),
            stats: {
              area: {
                sum: 0,
                'sum-of-squares': 0,
              },
              weight: {
                sum: 0,
                'sum-of-squares': 0,
              },
						  'sum-yield-squared-area': 0,
						  'yield-squared-area': 0,
              count: 0,
            },
            datum: 'WGS84',
            'geohash-data': {},
          };
 
          var template_id;
          if (!tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].templates) { 
            template_id = uuid.v4();
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].templates = {};
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].templates[template_id] = {
              area: { units: 'acres' },
              weight: { units: 'bushels' },
              moisture: { 
                units: '%H2O',
                value: tradeMoisture[cropType]
              },
              location: { datum: 'WGS84' },
            }
          } else { 
            template_id = Object.keys(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].templates)[0];
          }
        
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].stats = 
            recomputeStats(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh].stats, additionalStats);
        
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh]['geohash-data'][aggregateGh] = 
            tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh]['geohash-data'][aggregateGh] || {
              template: template_id,
              area: {
                sum: 0,
                'sum-of-squares': 0,
              },
              weight: {
                sum: 0,
                'sum-of-squares': 0,
              },
              count: 0,
						  'sum-yield-squared-area': 0,
						  'yield-squared-area': 0,
            };
          tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh]['geohash-data'][aggregateGh] = 
            recomputeStats(tree.harvest['tiled-maps']['dry-yield-map']['crop-index'][cropType]['geohash-length-index'][ghlen]['geohash-index'][bucketGh]['geohash-data'][aggregateGh], additionalStats);

          return tree;
        });
      });
    });
  }, {concurrency: 1});
};

recomputeStats = function(currentStats, additionalStats) {
  currentStats.count = currentStats.count + additionalStats.count;
  currentStats.area.sum = currentStats.area.sum + additionalStats.area.sum;
  currentStats.area['sum-of-squares'] = currentStats.area['sum-of-squares'] + additionalStats.area['sum-of-squares'];
  currentStats.weight.sum = currentStats.weight.sum + additionalStats.weight.sum;
	currentStats.weight['sum-of-squares'] = currentStats.weight['sum-of-squares'] + additionalStats.weight['sum-of-squares'];
	currentStats['sum-yield-squared-area'] = currentStats['sum-yield-squared-area'] + additionalStats['sum-yield-squared-area'];
  return currentStats;
};

// Handle a large json of oada data; build from the top down
putLinkedTree = function(setupTree, url) {
	return Promise.each(Object.keys(setupTree || {}), (key) => {
		if (typeof setupTree[key] === 'object' && setupTree[key]) {
			if (setupTree[key]._id) {
				let data = (setupTree[key]['geohash-index']) ? {} : replaceLinks(_.clone(setupTree[key]));
				return axios({
					method:'put', 
					url:'https://'+DOMAIN+'/'+setupTree[key]._id,
					headers: {
						'Authorization': 'Bearer '+ TOKEN,
						'Content-Type': setupTree[key]._type,
					},
					data,
				}).then((response) => {
					let link = {_id: setupTree[key]._id}
					if (setupTree[key]._rev) link._rev = setupTree[key]._rev
					if (setupTree[key]['geohash-data']) {
						let path = urlLib.parse(url).path;
						console.log('going to Create', path+'/'+key)
						return Promise.delay(5000).then(() => {
							return axios({
								method:'put', 
								url: url+'/'+key,
								headers: {
									'Authorization': 'Bearer '+ TOKEN,
									'Content-Type': setupTree[key]._type,
								},
								data: link,
							}).then(() => { return putLinkedTree(setupTree[key], url+'/'+key)})
						})
					} else {
						return axios({
							method:'put', 
							url: url+'/'+key,
							headers: {
								'Authorization': 'Bearer '+ TOKEN,
								'Content-Type': setupTree[key]._type,
							},
							data: link,
						}).then(() => { return putLinkedTree(setupTree[key], url+'/'+key)})
					}
				}).catch((e) => {
					console.log(e)
					return
				})
			}
			return putLinkedTree(setupTree[key], url+'/'+key)
		} else return
	})
}

replaceLinks = function(data) {
	var ret = (Array.isArray(data)) ? [] : {};
	if (!data) return data;
	Object.keys(data).forEach(function(key, idx) {
		var val = data[key];
		if (typeof val !== 'object' || !val) {
			ret[key] = val; // keep it as-is
			return;
		}
		if (val._id) { // If it's an object, and has an '_id', make it a link from data
			ret[key] = { _id: data[key]._id};
			if (data[key]._rev) ret[key]._rev = data[key]._id;
			return;
		}
		ret[key] = replaceLinks(data[key],val); // otherwise, recurse into the object looking for more links
	});
	return ret;
}
