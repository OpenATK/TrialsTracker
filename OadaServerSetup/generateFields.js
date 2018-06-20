var createOadaFields = require('./fieldBoundaryConverter.js');
/*
	To obtain token for an OADA server:
	- obtain from https://client.oada-dev.com after running OADA server.
	- type in the third domain box your host domain, e.g., 'localhost:3000'
	- press Get Access Token
*/
var fields_directory = process.argv[2] || 'fields';
var domain = process.argv[3] || 'vip3.ecn.purdue.edu';
var token = process.argv[4] || 'def';
var grower = process.argv[5] || 'AaronAult';
var farm = process.argv[6] || 'AultFarms';
createOadaFields(fields_directory, domain, token, grower, farm);
