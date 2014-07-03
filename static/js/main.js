window.onload = function() {
	var socket = io.connect('http://localhost:3000');
	socket.emit('subscribe', {"location" : "toronto"});
	socket.on('photos', function (data) {
		console.log(data);
		socket.emit('heartbeat', {'data' : 'hi'});
	});
}