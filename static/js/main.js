window.onload = function() {
	var url = "http://aaronmorais.com:3000"
	var socket = io.connect(url);
	socket.emit('subscribe', {"location" : "Toronto"});
	socket.on('photos', function (data) {
		console.log(data);
		socket.emit('heartbeat', {'data' : 'hi'});
	});
}