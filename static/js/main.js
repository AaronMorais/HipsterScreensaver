// Handles the photos received frmo socket.io
function handleNewPhoto(data, shown) {
  if (shown.indexOf(data) !== -1) { return; }
  shown.push(data);
  $("body").prepend("<img id=\"image\" src=\"" + data + "\" />", function(content) {
    setTimeout(function() {
      $(this).remove(); 
    }.bind(content)); 
  });
}

// Adds a list of cities to the dropdown
function addSupportedLocations(data) {
  for (var city in data) {
    var city_html = "<li role=\"presentation\"><a class=\"location\" role=\"menuitem\" tabindex=\"-1\">"
      + city + "</a></li>";
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
		  $(".dropdown").fadeOut("normal", function() {
		    $(this).remove();
		  });
		});
	});
}
