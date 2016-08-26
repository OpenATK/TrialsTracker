var csvToGeohashYieldFormat = require('./csvConverter.js').csvToOadaYieldFormat;
var setupOadaReferenceServer = require('./setupOadaReferenceServer.js').setup;

setupOadaReferenceServer();
csvToOadaYield();

