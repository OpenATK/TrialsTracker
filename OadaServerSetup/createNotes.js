//let oada = require('node-oada-client');
let oada = require('../src/oadaLib');
let fs = require('fs');
/*
	Obtain token for OADA server
	- obtain from https://client.oada-dev.com after running OADA server.
	- type in the third domain box your host domain, e.g., 'localhost:3000'
	- press Get Access Token
*/
var file = process.argv[2] || 'initial_notes.json';
var domain = process.argv[3] || 'vip3.ecn.purdue.edu';
var token = process.argv[4] || 'def';

tree = {
	'*': {}
}

var content = fs.readFileSync(file);
content = JSON.parse(content)
console.log(content);
//oadaLib.smartPut('https://'+domain+'/bookmarks/notes')
