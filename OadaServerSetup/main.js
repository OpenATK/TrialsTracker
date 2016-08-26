var csvToOadaYield = require('./csvToOadaYieldFormat.js');
var setupOadaReferenceServer = require('./setupOadaReferenceServer.js');
var token = process.argv[2].val;

setupOadaReferenceServer(token);
csvToOadaYield(token);

