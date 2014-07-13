// Handles the photos received frmo socket.io
function handleNewPhoto(data, shown) {
console.log("Receiving a new photo");
  if (shown.indexOf(data) !== -1) { return; }
  shown.push(data);
  $("body").prepend("<img id=\"image\" src=\"" + data + "\" />");
}

// Adds a list of cities to the dropdown
function addSupportedLocations(data) {
  for (var city in data) {
    var city_html = "<li role=\"presentation\"><a class=\"location\" role=\"menuitem\" tabindex=\"-1\">" + city + "</a></li>";
    $("#dropdownList").append(city_html);
  }
}

window.onload = function() {
	var shown = [];
	var url = "http://aaronmorais.com:3000";
	var socket = io.connect(url);
	socket.on('photos',function(data) {
		handleNewPhoto(data, shown);
	});

	$('#dropdownButton').dropdown();
	$.get("supportedLocations", function(data) {
		addSupportedLocations(data);
		  $(".location").click(function() {
		    socket.emit('subscribe', {"location" : this.text});
			console.log("Subscribing");
		    $(".dropdown").fadeOut("normal", function() {
		      $(this).remove();
		    });
		  });
	});

}
