var express = require('express');
var bodyParser = require('body-parser');
var request = require("request");

var app = express();
var api = require('instagram-node').instagram();
var key = require('./key.js');
var port = process.env.PORT || 3000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});
var io = require('socket.io').listen(server);

var clients = {};
var locations = {};

var url = "http://aaronmorais.com:3000";
var redirect_uri = url + '/handleauth';

api.use({
  client_id: key.CLIENT_ID,
  client_secret: key.CLIENT_SECRET,
});

app.get('/', function(req, res){
  res.sendfile(__dirname + '/static/views/index.html');
});

app.get('/geography', function(req, res) {
  console.log("Responding to subscription handshake: " + req.query['hub.challenge']);
  res.send(req.query['hub.challenge']);
});

app.post('/geography', function(req, res) {
  request({
    uri: "https://api.instagram.com/v1/geographies/" + req.body[0]["object_id"] + "/media/recent?client_id=" + key.CLIENT_ID,
    method: "GET",
  }, function(error, response, body) {
    body["data"].forEach(function(data) {
      console.log(data["filter"]);
      console.log(data["images"]["standard_resolution"]);
    });
  })
});

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

addLocation(35.657872, 139.70232);

function addLocation(lat, lng) {
  api.add_geography_subscription(lat, lng, 5000, url + '/geography', function(err, result, limit) {});
}
