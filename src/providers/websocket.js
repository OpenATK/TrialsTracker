import Promise  from 'bluebird';
const uuid = require('uuid/v4');
var cachedProvider = null;

function websocketClient(context, config, promise) {
    //Create the message queue
    var messages = [];
    //Create the socket
    let url = config.url.replace('https://', 'wss://').replace('http://', 'ws://');
    if (url.indexOf('ws') !== 0) url = url + 'wss://';
    var socket = new WebSocket(url);
    var connected = false;
    var httpCallbacks = {};
    var watchSignals = {};

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
        } else if (watchSignals[response.requestId]) {
          if (watchSignals[response.requestId].resolve) {
            if (response.status === 'success') {
              //Successfully setup websocket, resolve promise
              watchSignals[response.requestId].resolve(response);
            } else {
              let err = new Error('Request failed with status code '+response.status);
              err.response = response;
              watchSignals[response.requestId].reject(err);
            }
            //Remove resolve and reject so we process change as a signal next time
            delete watchSignals[response.requestId]['resolve'];
            delete watchSignals[response.requestId]['reject'];
          } else {
            //Call signal assigned during .watch() passing response
            let signalPath = watchSignals[response.requestId].signalPath;
            let signal = context.controller.getSignal(signalPath);
            if (signal == null) throw new Error('Signal at path `'+signalPath+'` is not defined.');
            signal({response});
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
        if (request.url.indexOf(config.url) === 0) request.url = request.url.replace(config.url, '');
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

    function _watch(request, signalPath) {
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
        watchSignals[message.requestId] = {signalPath, resolve, reject};
        sendMessages();
      });
    }

    function _close() {
      //TODO reject all callbacks that have not resolved
      //Clear everything
      messages = [];
      httpCallbacks = {};
      watchSignals = {};
      //Close socket
      socket.close();
    }

    function _url() {
      return config.url
    }

    return {
      url: _url,
      http: _http,
      close: _close,
      watch: _watch
    }
}


function createProvider(context, config, promise) {
  var provider = {};
  if (config) {
    provider = websocketClient(context, config, promise);
  }
  provider.configure = function configure(config) {
    return new Promise((resolve, reject) => {
      let promise = {resolve, reject};
      cachedProvider = createProvider(context, config, promise);
    });
  }
  return provider;
}

function websocket (context) {
  context.websocket = cachedProvider = (cachedProvider || createProvider(context));
  if (context.debugger) {
    context.debugger.wrapProvider('websocket');
  }
  return context;
}

export default websocket;
