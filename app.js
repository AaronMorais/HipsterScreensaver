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
  console.log("Listening on port " + port);
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
  res.send(req.query['hub.challenge']);
});

app.get('/readsubscriptions', function(req, res) {
  api.subscriptions(function(err, subscriptions, limit){
    res.send(subscriptions);
  });
});

app.post('/geography', function(req, res) {
  console.log("Getting an image from subscription");
  request({
    uri: "https://api.instagram.com/v1/geographies/" 
      + req.body[0]["object_id"] + "/media/recent?client_id=" + key.CLIENT_ID,
    method: "GET",
  }, function(error, response, body) {
    body = JSON.parse(body);
    if (!body.data) {
      console.log("No body data");
      return; 
    }
    console.log("Data received");
    body.data.forEach(function(data) {
      var location = getCity(data.location.latitude, data.location.longitude);
      console.log(location);
      broadcastDataForLocation(location, data);
    });
  });
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

app.get('/supportedLocations', function(req, res) {
  res.send(supported_locations);
});

app.get("/delete", function(req, res) {
  api.del_subscription({ all: true }, function(err, subscriptions, limit){});
  res.send(200);
});

app.get("/debug", function(req, res) {
  console.log(subscribed_locations);
  res.send(200);
});

io.on('connection', function (socket) {

	clients[socket.id] = socket;

	socket.on('subscribe', function (data) {
		var location = data['location'];

  	if (subscribed_locations[location]) {
  		subscribed_locations[location].push(socket.id);
  	} else {
      addLocation(supported_locations[location]["latitude"], supported_locations[location]["longitude"]);
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
console.log(data.filter);
	if (data.filter === "Normal" && false) {
		console.log("WTF WHY NO FILTER");
		return;
	}
	var subscribedClients = subscribed_locations[location];
	if (subscribedClients) {
		console.log("Broadcasting");
		for (var j = 0; j < subscribedClients.length; j++) {
			clients[subscribedClients[j]].emit('photos', data.images.standard_resolution.url);
		}
	}
}

function addLocation(lat, lng) {
  api.add_geography_subscription(lat, lng, 5000,
      url + '/geography', function(err, result, limit) {
	 console.log(result);
    if (!err) {
      console.log("Success subscribed!"); 
    }
  });
}

function getCity(lat, lng) {
	return "San Francisco";
  var smallestCity;
  var smallestDistance = -1;
  for (var city in supported_locations) {
    var cityDistance = distance(lat, lng, supported_locations[city]["latitude"],
      supported_locations[city]["longitude"]);
    if (cityDistance < smallestDistance) {
      cityDistance = smallestDistance;
      smallestCity = supported_locations[city];
    }
  }
  return smallestCity;
}

Number.prototype.toRadians = function() { return this * Math.PI / 180; }

function distance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var φ1 = lat1.toRadians();
  var φ2 = lat2.toRadians();
  var Δφ = (lat2-lat1).toRadians();
  var Δλ = (lon2-lon1).toRadians();

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  var d = R * c;
}
