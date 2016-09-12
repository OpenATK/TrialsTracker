var csvToOadaYield = require('./csvToOadaYieldFormat.js');
/*
	Obtain token for OADA server from command line
		- obtain from https://client.oada-dev.com after running OADA server.
		- type in the third domain box your host url 'localhost:3000'
		- press Get Access Token
*/
var token = process.argv[2];

//Upload data from ../csvConverter to the OADA server
csvToOadaYield(token);

