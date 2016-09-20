//var csvToOadaYield = require('./csvToOadaYieldFormat.js');
//var serverSetup = require('./serverSetup.js');
var combinedFile = require('./combinedFile.js');
/*
	Obtain token for OADA server from command line
		- obtain from https://client.oada-dev.com after running OADA server.
		- type in the third domain box your host url 'localhost:3000'
		- press Get Access Token
*/
var yield_data_directory = process.argv[2];
var token = process.argv[3];
//serverSetup(token);
//Upload data from ../csvConverter to the OADA server
//csvToOadaYield(token);
combinedFile(yield_data_directory, token);
