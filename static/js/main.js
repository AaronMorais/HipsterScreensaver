window.onload = function() {
	var shown = [];
	var url = "http://aaronmorais.com:3000"
	var socket = io.connect(url);
	socket.on('photos', function (data) {
		if (shown.indexOf(data) !== -1) { return; }
		shown.push(data);
		$("body").prepend("<img id=\"image\" src=\"" + data + "\" />");
	});
	$.get(
	    "supportedLocations",
	    function(data) {
	    	for (var city in data) {
	    		var city_html = "<li role=\"presentation\"><a class=\"location\" role=\"menuitem\" tabindex=\"-1\">" + city + "</a></li>";
	    		$("#dropdownList").append(city_html);
	    	}
	    	$(".location").click(function() {
	    		socket.emit('subscribe', {"location" : this.text});
	    		$(".dropdown").fadeOut("normal", function() {
	    			$(this).remove();
	    		});
	    	});
	        $('#dropdownButton').dropdown();
	    }
	);
}
