// Handles the photos received frmo socket.io
function handleNewPhoto(data) {
  if (shown.indexOf(data) !== -1) { return; }
  shown.push(data);
  $("body").prepend("<img id=\"image\" src=\"" + data + "\" />");
}

// Adds a list of cities to the dropdown
function addSupportedLocations(data) {
  for (var city in data) {
    $("#dropdownList").append(
      $('li', {
        role: "presentation",
      }).append(
        $('a', {
          class: "location",
          role: "menuitem",
          tabindex="-1",
        }).text(city), 
      ),
    );
  }
}

window.onload = function() {
	var shown = [];
	var url = "http://aaronmorais.com:3000"
	var socket = io.connect(url);
	socket.on('photos', handleNewPhoto);

  $('#dropdownButton').dropdown();
	$.get(
	  "supportedLocations",
    addSupportedLocations,
	);

  $(".location").click(function() {
    socket.emit('subscribe', {"location" : this.text});
    $(".dropdown").fadeOut("normal", function() {
      $(this).remove();
    });
  });
}
