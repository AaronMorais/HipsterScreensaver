var express = require('express');
var app = express();
var api = require('instagram-node').instagram();
var key = require('./key.js');

api.use({
  client_id: key.CLIENT_ID,
  client_secret: key.CLIENT_SECRET,
});

var url = "http://www.aaronmorais.com"
var redirect_uri = url + '/handleauth';

app.get('/authorize', function(req, res) {
  res.redirect(api.get_authorization_url(redirect_uri));
});

app.get('/handleauth', function(req, res) {
  api.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
      console.log(err.body);
      res.send("Didn't work");
    } else {
      console.log('Yay! Access token is ' + result.access_token);
      api.add_geography_subscription(48.565464564, 2.34656589, 100, url + '/geography/', function(err, result, limit) {
        console.log(err, result, limit);
      });
      res.send('You made it!!');
    }
  });
});

app.get('/', function(req, res){
  res.send('Hello World');
});

app.get('/geography', function(req, res) {
  res.send(req.query['hub.challenge']);
});

app.post('/geography', function(req, res) {
  console.log(req.body);
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});
