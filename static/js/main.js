// Handles the photos received frmo socket.io
function handleNewPhoto(data, shown) {
  if (shown.indexOf(data) !== -1) { 
    console.log("Already shown");
    return; 
  }
  shown.push(data);
  window.images.push(data);
}

// Build an image with a random location on the screen
function buildImage(data) {
  var img = $('<img>');
  var width = (1+Math.random()) * 300;
  img.attr('src', data); 
  img.css('position', 'fixed');
  img.css('width', width.toString() + 'px');

  var top = Math.floor(Math.random() * ($(document).width()-img.width()));
  var left = Math.floor(Math.random() * ($(document).height()-img.height()));
  img.css('left', left.toString() + "px");
  img.css('top', top.toString() + "px");

  return img;
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
  var backup_index = 0;
	var url = "http://aaronmorais.com:3000";
	var socket = io.connect(url);
        $("body").css('position', 'relative');
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

  window.images = [];
  var loader =  setInterval(function() {
    var data = null;
    if (window.images.length === 0) {
      if (shown.length === 0) {
        return;
      } else {
        data = shown[backup_index % shown.length];
        backup_index += 1;
      }
    } else {
      data = window.images.shift();
    }
    var img = buildImage(data);
    img.hide().prependTo('body').fadeIn()

    var horizontal_position = Math.floor(Math.random() * $(document).width());
    var timing = Math.floor(4000 * (1+Math.random()));
    img.animate({
      left: horizontal_position.toString(),
    }, {
      "duration": timing,
      "queue": false
    }, "linear");
    img.delay(timing-1000).fadeOut('slow', function() {
      $(this).remove();
    });
  }, 1000);
}
