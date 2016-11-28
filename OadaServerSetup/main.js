var serverSetup = require('./serverSetup.js');
/*
	Obtain token for OADA server
	- obtain from https://client.oada-dev.com after running OADA server.
	- type in the third domain box your host domain, e.g., 'localhost:3000'
	- press Get Access Token
*/
var yield_data_directory = process.argv[2];
var domain = process.argv[3];
var token = process.argv[4];
//Convert and upload data from yield_data_directory to the OADA server
serverSetup(yield_data_directory, domain, token);
