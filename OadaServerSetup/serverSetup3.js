var _ = require('lodash');
var csvjson = require('csvjson');
var gh = require('ngeohash');
var rr = require('recursive-readdir');
var uuid = require('uuid')
var fs = require('fs');
var oadaIdClient = require('oada-id-client');
var PouchDB = require('pouchdb');
var Promise = require('bluebird');
var axios = require('axios');
var md5 = require('md5');
var pointer = require('json-pointer');
var oada = require('../src/oadaLib');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var tradeMoisture = {
  soybeans:  13,
  corn: 15,
  wheat: 13,
};
var TOKEN;
var DOMAIN;
var WS;

var setupTree = {
	'bookmarks': {
		'_type': "application/vnd.oada.bookmarks.1+json",
		_rev: '0-0',
		'harvest': {
			'_type': "application/vnd.oada.harvest.1+json",
		  _rev: '0-0',
			'as-harvested': {
				'_type': 'application/vnd.oada.as-harvested.1+json',
		     _rev: '0-0',
				'yield-moisture-dataset': {
					'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
		      _rev: '0-0',
					'crop-index': {
						'*': {
							'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
		          _rev: '0-0',
							'geohash-length-index': {
								'*': {
									'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
              		_rev: '0-0',
									'geohash-index': {
										'*': {
											'_type': 'application/vnd.oada.as-harvested.yield-moisture-dataset.1+json',
		                  _rev: '0-0',
										}
									}
								}
							}
						}
					}
				},
			},
		},
	},
};

module.exports = function(directory, domain, token) {
  TOKEN = token;
  DOMAIN = domain;
	rr('./' + directory, (err,files) => {
    files = files.filter((file) => {
      return (file.substr(-3) === 'csv');
		})
    return Promise.map(files, (file) => {
      console.log('Processing ' + file);
      var options = { delimiter : ','};
      var data = fs.readFileSync(file, { encoding : 'utf8'});
      var jsonCsvData = csvjson.toObject(data, options);
      return this.processRawData(jsonCsvData, file)
      //.then((tree) => {
        //		  		return treePut(DOMAIN,TOKEN, '/bookmarks', tree[key], aTree, ).then((res) => {
        /*				return _Setup.putLinkedTree(tree[key], key).then((res) => {
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
        */
        //          })
      //})
    }, {concurrency: 1})
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

    var template = {
      area: { units: 'acres' },
      weight: { units: 'bushels' },
      yield: { units: 'bu/ac' },
      moisture: { units: '%H2O' },
      location: { datum: 'WGS84' },
    }
		var template_id = md5(JSON.stringify(template));

    // Add the data point
    var pt = {
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
		//		console.log('putting a point into bucket:', geohash, pt)
		var id = md5(JSON.stringify(pt)); //uuid.v4(); 
		pt.id = id;
		//push the point
		let stuff = {
			data: {
				[id]: pt
			}
		}

		let url = 'https://'+DOMAIN+'/bookmarks/harvest/as-harvested/yield-moisture-dataset/crop-index/'+cropType+'/geohash-length-index/geohash-7/geohash-index/'+geohash;
		console.log('Here', i, cropType, geohash)

		return Promise.delay(1000).then(() => {
			return oada.smartPut({
        url,
        setupTree,
        token: TOKEN,
        data: stuff
			}).catch((err) => {
				console.log('somethin bad happened', err)
			})
		})
	}, {concurrency: 1}).catch((err) => {
		console.log('bad happened', err)
	})
}

recomputeStats = function(currentStats, additionalStats) {
  currentStats.count = currentStats.count + additionalStats.count;
  currentStats.area.sum = currentStats.area.sum + additionalStats.area.sum;
  currentStats.area['sum-of-squares'] = currentStats.area['sum-of-squares'] + additionalStats.area['sum-of-squares'];
  currentStats.weight.sum = currentStats.weight.sum + additionalStats.weight.sum;
	currentStats.weight['sum-of-squares'] = currentStats.weight['sum-of-squares'] + additionalStats.weight['sum-of-squares'];
	currentStats['sum-yield-squared-area'] = currentStats['sum-yield-squared-area'] + additionalStats['sum-yield-squared-area'];
	console.log(currentStats['sum-yield-squared-area']);
  return currentStats;
};


