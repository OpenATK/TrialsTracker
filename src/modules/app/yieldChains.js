import uuid from 'uuid';
import gh from 'ngeohash';
import request from 'superagent';
import bair from './Bair100.js';
import _ from 'lodash';
import md5 from 'md5';
import PouchDB from 'pouchdb';
import oadaIdClient from 'oada-id-client';

export var initialize = [
  getAccessToken, {
    success: [storeToken],
    error: []
  },
];

export var handleAuth = [
  storeToken,
];

export var getYieldData = [
  getData, 
];

export var handleRequestResponse = [
  storeMd5, storeData,
];

function initPouch({}) {
  this._db = new PouchDB('yield-data');
};

function getAccessToken({input, state, output}) {
  var self = this;
  var options = {
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9vYXV0aDIvcmVkaXJlY3QuaHRtbCJdLCJ0b2tlbl9lbmRwb2ludF9hdXRoX21ldGhvZCI6InVybjppZXRmOnBhcmFtczpvYXV0aDpjbGllbnQtYXNzZXJ0aW9uLXR5cGU6and0LWJlYXJlciIsImdyYW50X3R5cGVzIjpbImltcGxpY2l0Il0sInJlc3BvbnNlX3R5cGVzIjpbInRva2VuIiwiaWRfdG9rZW4iLCJpZF90b2tlbiB0b2tlbiJdLCJjbGllbnRfbmFtZSI6IlRyaWFscyBUcmFja2VyIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vZ2l0aHViLmNvbS9PcGVuQVRLL1RyaWFsc1RyYWNrZXItQ2VyZWJyYWwiLCJjb250YWN0cyI6WyJTYW0gTm9lbCA8c2Fub2VsQHB1cmR1ZS5lZHUiXSwic29mdHdhcmVfaWQiOiIzMmQ3NjNkNy02NzZlLTQ5MzItOTk4NS0xOGMyYjIxYjlmNDkiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTQ2NDM3NTQ4M30.qC1cmAspdusal-o3bjQIJNls_KJtwYJMr_WODJkUM-3ltp3FHsPC1-eqdpsAbC7WrSJqwi_55J26UCL0jqRYNT5M_szIhRy5-XRvMhHJ8XDE54bFgI45dz5S5fcuGC0ehETyCyvrlsHomIIqKz-LyvIwbOUpNThIpruEMvNgW-Q',
    scope: 'some.oada.defined.scope',
  };
  var domain = 'localhost:3000';
  oadaIdClient.getAccessToken(domain, options, function(err, accessToken) {
    if (err) { console.dir(err); output.error(); } // Soemthing went wrong  
    output.success({token:accessToken});
  });
};

getAccessToken.outputs = ['success', 'error'];
getAccessToken.async = true;

function storeMd5({input, state}) {
  var geohash = input.data.context['geohash-7'];
  var allHashes = state.get([ 'home', 'yield_hashes' ]);
  state.set([ 'home', 'yield_hashes',  geohash], md5(JSON.stringify(input.data)));
};

function storeData({input, state}) {
/*
  if (!input.error) { 
    var img = input.context.getImageData(0,0,256,256);
    var data = img.data;

    for (var j = 0; j < img.height; j++) {
      for (var i = 0; i < img.width; i++) {
        //TODO: Compute Color
//        var color = getColor;
        data[((j*256+i)*4)]   = 0; // red
        data[((j*256+i)*4)+1] = 0; // green
        data[((j*256+i)*4)+2] = 0; // blue
        data[((j*256+i)*4)+3] = 128; // alpha
      }
    } 
    input.context.putImageData(img, 0, 0);
    input.context.drawImage(input.context.canvas, 0, 0); 
  }
  var doc = {data: input.data, imageData: data};
  //TODO: after I get data in oada, get the geohash-7 as the ID
  var docId = input.data.geohash7;
  this._db.put(doc, docId);
*/
};

function storeToken({input, state}) {
  state.set(['home', 'token'], input.token);
};

function getData ({input, state}) {
};


