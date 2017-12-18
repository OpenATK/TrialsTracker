import Promise  from 'bluebird';
const uuid = require('uuid/v4');

function websocket(url, promise) {
  //Create the message queue
  var messages = [];
  //Create the socket
  url.replace('https://', 'wss://').replace('http://', 'ws://');
  url = url.indexOf('ws') !== 0 ? url + 'wss://' : url;
  var socket = new WebSocket(url);
  var connected = false;
  var httpCallbacks = {};
  var watchCallbacks = {};

  socket.onopen = function(event) {
    connected = true;
    promise.resolve();
    sendMessages();
  }
  socket.onclose = function(event) {

  }
  socket.onmessage = function(event) {
    var response = JSON.parse(event.data);
    //Look for id in httpCallbacks
    if (response.requestId) {
      if (httpCallbacks[response.requestId]) {
        //Resolve Promise
        if (response.status >= 200 && response.status < 300) {
          httpCallbacks[response.requestId].resolve(response);
        } else {
          //Create error like axios
          let err = new Error('Request failed with status code '+response.status);
          err.request = httpCallbacks[response.requestId].request;
          err.response = {
            status: response.status,
            statusText: response.status,
            headers: response.headers,
            data: response.data
          };
          httpCallbacks[response.requestId].reject(err);
        }
        delete httpCallbacks[response.requestId];
      } else if (watchCallbacks[response.requestId]) {
        if (watchCallbacks[response.requestId].resolve) {
          if (response.status === 'success') {
            //Successfully setup websocket, resolve promise
            watchCallbacks[response.requestId].resolve(response);
          } else {
            let err = new Error('Request failed with status code '+response.status);
            err.response = response;
            watchCallbacks[response.requestId].reject(err);
          }
          //Remove resolve and reject so we process change as a signal next time
          delete watchCallbacks[response.requestId]['resolve'];
          delete watchCallbacks[response.requestId]['reject'];
				} else {
          if (watchCallbacks[response.requestId].func == null) throw new Error('The given watch function is undefined:', watchCallbacks[response.requestId]);
          watchCallbacks[response.requestId].func(response);
        }
      }
    }
  }

  function sendMessages() {
    if (!connected) return;
    messages.forEach((message) => {
      socket.send(JSON.stringify(message));
    });
    messages = [];
  }

  function _http(request) {
    //Do a HTTP request
    return new Promise((resolve, reject) => {
      if (request.url.indexOf(url) === 0) request.url = request.url.replace(url, '');
      let message = {
        requestId: uuid(),
        method: request.method.toLowerCase(),
        path: request.url,
        data: request.data
      };
      if (request.headers && request.headers.Authorization) {
        message.authorization = request.headers.Authorization;
      }
      if (request.headers && request.headers['Content-Type']) {
        message.contentType = request.headers['Content-Type'];
      }
      messages.push(message);
      httpCallbacks[message.requestId] = {
        request: request,
        resolve: resolve,
        reject: reject
      };
      sendMessages();
     });
  }

  function _watch(request, callback) {
    //Watch for changes on requested resource and trigger provided signal
    return new Promise((resolve, reject) => {
      let message = {
        requestId: uuid(),
        method: 'watch',
        path: request.url
      };
      if (request.headers && request.headers.Authorization) {
        message.authorization = request.headers.Authorization;
      }
      messages.push(message);
      watchCallbacks[message.requestId] = {resolve, reject, callback};
       sendMessages();
    });
  }

  function _close() {
    //TODO reject all callbacks that have not resolved
    //Clear everything
    messages = [];
    httpCallbacks = {};
    watchCallbacks = {};
    //Close socket
    socket.close();
  }

  function _url() {
    return url
  }

  return {
    url: _url,
    http: _http,
    close: _close,
    watch: _watch
  }
}

export default websocket;
