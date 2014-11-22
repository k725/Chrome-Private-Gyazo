$(function() {
	$('#captureCrop').click(function() {
		chrome.tabs.query({
			currentWindow: true,
			active: true
		},
		function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {
				action: 'gyazoCapture'
			}, function(mes){});
			window.close();
		});
	});

	$('#captureWindow').click(function() {
		chrome.tabs.query({
			currentWindow: true,
			active: true
		},
		function(tabs) {
			chrome.runtime.sendMessage(chrome.runtime.id, {
				tab: tabs[0],
				action: 'gyazoWholeCaptureFromPopup'
			}, function(){});
			window.close();
		});
	});
});