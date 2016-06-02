var express = require('express');

var app = express();
app.use(express.static(__dirname + '/dist'));
//TODO: webpack copy redirect and main.browserify.js

app.use('/oauth2', express.static('oauth2'));

var port = 8000;
if (process.env.NODE_ENV === 'production') {
  port = process.env.PORT;
}
app.listen(port, function() {
  console.log('Server listening on port ' + port);
});
