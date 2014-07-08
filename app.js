var express = require('express');
var app = express();
var api = require('instagram-node').instagram();
var key = require('./key.js');
var port = process.env.PORT || 3000;

var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});
var io = require('socket.io').listen(server);

var url = "http://aaronmorais.com:" + process.env.PORT || 3000;
var redirect_uri = url + '/handleauth';

api.use({
  client_id: key.CLIENT_ID,
  client_secret: key.CLIENT_SECRET,
});

app.use(express.static(__dirname + '/static'));

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
      console.log("Testing a geography location");
      api.add_geography_subscription(48.565464564, 2.34656589, 100, url + '/geography', function(err, result, limit) {
        console.log(result, limit);
      });
      res.send('Success');
    }
  });
});

app.get('/', function(req, res){
  res.sendfile(__dirname + '/static/views/index.html');
});

app.get('/geography', function(req, res) {
  console.log("Responding to subscription handshake: " + req.query['hub.challenge']);
  res.send(req.query['hub.challenge']);
});

app.post('/geography', function(req, res) {
  console.log(req);
});

var clients = {};
var locations = {};
io.on('connection', function (socket) {

	console.log("New Connection " + socket.id);
	clients[socket.id] = socket;

  	socket.on('subscribe', function (data) {
  		var location = data['location'];
    	console.log("Subscription Location: " + location);
    	if (locations[location]) {
    		locations[location].push(socket.id);
    	} else {
    		locations[location] = [socket.id];
    	}
  	});

  	socket.on('disconnected', function (data) {
		for (var j = 0; j < locations.length; j++) {
  			var i = locations[j].indexOf(socket.id);
			if(i != -1) {
				locations[j].splice(i, 1);
			}
		}
  	});
});

setInterval(function(){
	broadcastDataForLocation('toronto', {"photos":["photoA", "photoB"]});
}, 3000);


function broadcastDataForLocation (location, data) {
	console.log("Broadcasting for: " + location);
	var subscribedClients = locations[location];
	if (subscribedClients) {
		for (var j = 0; j < subscribedClients.length; j++) {
			clients[subscribedClients[j]].emit('photos', data);
		}
	}
}
