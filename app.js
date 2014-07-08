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
var subscribed_locations = {};

var url = "http://aaronmorais.com:3000";
var redirect_uri = url + '/handleauth';

api.use({
  client_id: key.CLIENT_ID,
  client_secret: key.CLIENT_SECRET,
});

app.use(express.static(__dirname + '/static'));

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
    body = JSON.parse(body);
    body.data.forEach(function(data) {
      console.log(data.filter);
      console.log(data.images.standard_resolution);
      var location = getCity(data.location.latitude, data.location.longitude);
      broadcastDataForLocation(location, data);
    });
  })
});

var supported_locations = {
  "Toronto" : {"latitude" : 43.7,
               "longitude" : -79.4
              },
  "Seattle" : {"latitude" : 47.6097,
               "longitude" : -122.331
              },
  "San Francisco" : {"latitude" : 37.7833,
                     "longitude" : -122.4167
              },
}

addLocation(43.7, -79.4);

app.get('/supportedLocations', function(req, res) {
  res.send(supported_locations);
});

io.on('connection', function (socket) {

	console.log("New Connection " + socket.id);
	clients[socket.id] = socket;

	socket.on('subscribe', function (data) {
		var location = data['location'];
  	console.log("Subscription Location: " + location);

  	if (subscribed_locations[location]) {
  		subscribed_locations[location].push(socket.id);
  	} else {
      api.subscriptions(function(err, subscriptions, limit){
        console.log(subscriptions);
      };
  		subscribed_locations[location] = [socket.id];
  	}
	});

	socket.on('disconnected', function (data) {
  	for (var j = 0; j < subscribed_locations.length; j++) {
  			var i = subscribed_locations[j].indexOf(socket.id);
  		if(i != -1) {
  			subscribed_locations[j].splice(i, 1);
  		}
  	}
	});
});

function broadcastDataForLocation (location, data) {
	console.log("Broadcasting for: " + location);
	var subscribedClients = subscribed_locations[location];
	if (subscribedClients) {
		for (var j = 0; j < subscribedClients.length; j++) {
			clients[subscribedClients[j]].emit('photos', data);
		}
	}
}

function addLocation(lat, lng) {
  api.add_geography_subscription(lat, lng, 5000, 
      url + '/geography', function(err, result, limit) {});
}

function getCity(lat, lng) {
  for (var city in supported_locations) {
    if (supported_locations[city]["latitude"] - lat < 1 
        && supported_locations[city]["longitude"] - lng < 1) {
      console.log(city);
      return city; 
    }     
  }
}
