var express = require('express');
var bodyParser = require('body-parser');
var request = require("request");
var supported_locations = require('./supportedLocations');
var util = require('./util');

var app = express();
var api = require('instagram-node').instagram();
var key = require('./key.js');
var port = process.env.PORT || 3000;

var url = "http://aaronmorais.com:3000";
var redirect_uri = url + '/handleauth';

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/static'));
api.use({
  client_id: key.CLIENT_ID,
  client_secret: key.CLIENT_SECRET,
});

var server = app.listen(port, function() {
  console.log("Listening on port " + port);
});
var io = require('socket.io').listen(server);

var clients = {};
var subscribed_locations = {};

var RequestQueue = function() {
  var queue = [];
  var shown = [];
  var isBusy = false;
  var push = function(request) {
    if (shown.indexOf(request.id) === -1) {
      shown.push(request.id);
    } else {
      console.log(request.id+" was already registered", shown);
      return;
    }

    console.log("Push", queue);
    if (!request) {
      return;
    }

    if (!isBusy) {
      request.send();
      isBusy = true;
    } else {
      queue.push(request);
    }
  };

  var done = function() {
    console.log("Done", queue);
    if (queue.length === 0) {
      isBusy = false;
      return;
    }

    var request = queue.shift();
    isBusy = true;
    request.send();
  };

  return {
    push: push,
    done: done,
  };
}

var IgRequest = function(req, CLIENT_ID, method, callback) {
  console.log(req.body[0]["object_id"]);
  var send = function() {
    request({
      uri: "https://api.instagram.com/v1/geographies/" + req.body[0]["object_id"] + "/media/recent?client_id=" + CLIENT_ID,
      method: method
    }, callback);
  };
  
  return {
    send: send,
    id: req.body[0]["object_id"],
  };
}


var queue = new RequestQueue();


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
  queue.push(new IgRequest(req, key.CLIENT_ID, "GET", 
    function(error, response, body) {
      body = JSON.parse(body);
      if (body.data) {
        body.data.forEach(function(data) {
          var location = getCity(data.location.latitude, data.location.longitude);
          broadcastDataForLocation(location, data);
        });
      } else {
        console.log("No body data", body);
      }
      queue.done();
    }
  ));
});

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
  console.log("Broadcasting");
  if (data.filter === "Normal" && false) {
    return;
  }

  var subscribedClients = subscribed_locations[location];
  if (subscribedClients) {
    for (var j = 0; j < subscribedClients.length; j++) {
      clients[subscribedClients[j]].emit('photos', data.images.low_resolution.url);
    }
  }
}

function getCity(lat, lng) {
  // For testing purpose
  return "San Francisco";

  var smallestCity;
  var smallestDistance = 4294967295;
  for (var city_name in supported_locations) {
    var city = supported_locations[city];
    var cityDistance = util.distance(lat, lng, 
      city["latitude"], city["longitude"]);
    if (cityDistance < smallestDistance) {
      cityDistance = smallestDistance;
      smallestCity = supported_locations[city];
    }
  }
  return smallestCity;
} 

function addLocation(lat, lng) {
  api.add_geography_subscription(lat, lng, 5000,
    url + '/geography', function(err, result, limit) {
      console.log(err, limit);
      if (!err) {
      }
    }
  );
}

