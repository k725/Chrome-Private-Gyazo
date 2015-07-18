var UploadNotification = function(callback) {
	this.progress    = 3;
	this.limitValues = [30, 80];
	this.limitLevel  = 0;
	this.limit       = this.limitValues[this.limitLevel];
	this.id          = 'gyazoModoki_notification_' + Date.now();
	this.newTabId    = null;
	callback         = callback || function(){};

	this.nextLimit = function () {
		if (this.limitLevel + 1 < this.limitValues.length) {
			this.limitLevel += 1;
		}

		this.limit = this.limitValues[this.limitLevel]
	};

	this.progressIncrement = function(callback) {
		const INCREMENT_SIZE = 5;

		this.progress = Math.min(this.progress + INCREMENT_SIZE, this.limit);

		this.update({
			progress : this.progress
		}, callback);
	};

	this.update = function(opt, callback) {
		callback = callback || function(){};

		chrome.notifications.update(this.id, opt, callback);
	};

	this.finish = function(callback) {
		var self = this;

		this.update({
			title    : chrome.i18n.getMessage('uploadingFinishTitle'),
			message  : chrome.i18n.getMessage('uploadingFinishMessage'),
			progress : 100
		}, function() {
			window.setTimeout(function() {
				chrome.notifications.clear(self.id, function(){});
			}, 1200);
		});
	};

	chrome.notifications.create(this.id, {
		type     : 'progress',
		title    : chrome.i18n.getMessage('uploadingServer'),
		message  : chrome.i18n.getMessage('uploadingServerMessage'),
		progress : this.progress,
		iconUrl  : '/icons/icon_256.png',
		priority : 2
	}, callback);
};

function toBlob(base64) {
	var binary = atob(base64.replace(/^.*,/, '')),
	    buffer = new Uint8Array(binary.length);

	for (var i = 0; i < binary.length; i++) {
		buffer[i] = binary.charCodeAt(i);
	}

	var blob = new Blob([buffer.buffer], {
		type : 'image/png'
	});

	return blob;
}

function postToGyazo(data) {
	var optionsServerUploadUrl,
	    optionsServerApiKey,
	    optionsServerUseBrowserSessionApi;

	chrome.storage.sync.get([
			'optionsServerUploadUrl',
			'optionsServerUsername',
			'optionsServerPassword',
			'optionsServerApiKey',
			'optionsServerApiType',
			'optionsOtherClipCopy',
			'optionsOtherUploadCompTab'
	], function(items) {
		if(chrome.extension.lastError === void 0) {
			if (
				items.optionsServerUploadUrl === void 0 ||
				!items.optionsServerApiType === void 0 ||
				!items.optionsOtherUploadCompTab === void 0
			) {
				window.alert(chrome.i18n.getMessage('uploadingServerEmpty'));
				return false;
			}

			var options = {
				optionsServerUploadUrl    : items.optionsServerUploadUrl,
				optionsServerUsername     : items.optionsServerUsername,
				optionsServerPassword     : items.optionsServerPassword,
				optionsServerApiKey       : items.optionsServerApiKey,
				optionsServerApiType      : items.optionsServerApiType,
				optionsOtherClipCopy      : items.optionsOtherClipCopy,
				optionsOtherUploadCompTab : items.optionsOtherUploadCompTab
			};

			uploadImage(data, options);
		} else {
			window.alert('Error: ' + chrome.extension.lastError);
		}
	});
}

function uploadImage(data, options) {
	var notification =  new UploadNotification(),
	    ajaxObject   = {};

	var timerId = window.setInterval(function() {
		notification.progressIncrement();
	}, 500);

	ajaxObject = {
		type        : 'POST',
		url         : options.optionsServerUploadUrl,
		crossDomain : true
	};

	if (options.optionsServerUsername !== '' && options.optionsServerPassword !== '') {
		ajaxObject.username = options.optionsServerUsername;
		ajaxObject.password = options.optionsServerPassword;
	}

	if (options.optionsServerApiType === 'optionsServerUseBrowserSessionApi') {
		ajaxObject.dataType = 'json';
		ajaxObject.data     = {
			client_id   : options.optionsServerApiKey,
			image_url   : data.imageData,
			title       : data.title,
			referer_url : data.url
		};
	} else if (options.optionsServerApiType === 'optionsServerUseOldApi') {
		var formData = new FormData();

		formData.append('imagedata', toBlob(data.imageData));

		ajaxObject.dataType    = 'text';
		ajaxObject.processData = false;
		ajaxObject.contentType = false;
		ajaxObject.data        = formData;
	}

	$.ajax(ajaxObject)
	.done(function(data) {
		var url;

		var callback = function(newTab) {
			notification.nextLimit();
			notification.newTabId = newTab.id;

			var handler = function(tabId, changeInfo) {
				if (newTab.id === tabId && changeInfo.url) {
					notification.finish();
					window.clearInterval(timerId);

					if (options.optionsOtherClipCopy) {
						saveToClipboard(changeInfo.url);
					}

					chrome.tabs.onUpdated.removeListener(handler);

					notification.newTabId = tabId;
				}
			};

			chrome.tabs.onUpdated.addListener(handler);
		};

		if (options.optionsServerApiType === 'optionsServerUseBrowserSessionApi') {
			url = data.get_image_url;
		} else if (options.optionsServerApiType === 'optionsServerUseOldApi') {
			url = data;
		}

		if (options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewBackground') {
			chrome.tabs.create({
				url      : url,
				active   : false
			}, callback);
		} else if (options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewRightBackground') {
			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.create({
					url      : url,
					index    : tab.index + 1,
					active   : false
				}, callback);
			});
		} else if (options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewOpen') {
			chrome.tabs.create({
				url      : url,
				active   : true
			}, callback);
		} else if (options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewRightOpen') {
			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.create({
					url      : url,
					index    : tab.index + 1,
					active   : true
				}, callback);
			});
		}
	})
	.fail(function(XMLHttpRequest, textStatus, errorThrown) {
		window.alert('Status: ' + XMLHttpRequest.status + '\nError: ' + textStatus + '\nMessage: '+ errorThrown.message);
	});
}

function onClickHandler(info, tab) {
	var GyazoFuncs = {
		gyazoIt : function() {
			if (info.srcUrl.match(/^data:/)) {
				postToGyazo({
					imageData : info.srcUrl,
					title     : tab.title,
					url       : tab.url
				});

				return;
			}

			var xhr = $.ajaxSettings.xhr();

			xhr.open('GET', info.srcUrl, true);

			xhr.responseType       = 'blob';
			xhr.onreadystatechange = function() {
				if(xhr.readyState === 4) {
					var fileReader = new FileReader();

					fileReader.onload = function(e) {
						postToGyazo({
							imageData : fileReader.result,
							title     : tab.title,
							url       : tab.url
						});
					};

					fileReader.readAsDataURL(xhr.response);
				}
			};

			xhr.send();
		},
		gyazoCapture : function() {
			chrome.tabs.sendMessage(tab.id, {
				action : 'gyazoCapture'
			}, function(mes){});
		},
		gyazoWhole : function() {
			var notificationId = 'gyazoModokiCapturing_' + Date.now();

			chrome.notifications.create(notificationId, {
				type     : 'basic',
				title    : chrome.i18n.getMessage('capturingWindow'),
				message  : chrome.i18n.getMessage('capturingWindowMessage'),
				iconUrl  : '/icons/icon_256.png',
				priority : 2
			}, function(){});

			chrome.tabs.sendMessage(tab.id, {
				action  : 'wholeCaptureInit',
				data    : {},
				context : {
					tabId          : tab.id,
					winId          : tab.windowId,
					notificationId : notificationId
				}
			}, function(){});
		}
	};

	if(info.menuItemId in GyazoFuncs) {
		chrome.tabs.executeScript(null, {
			file: './content.js'
		}, function() {
			GyazoFuncs[info.menuItemId]();
		});
	}
}

chrome.contextMenus.onClicked.addListener(onClickHandler);

chrome.runtime.onInstalled.addListener(function() {
	chrome.contextMenus.create({
		title    : chrome.i18n.getMessage('captureImage'),
		id       : 'gyazoIt',
		contexts : ['image']
	});
	chrome.contextMenus.create({
		title    : chrome.i18n.getMessage('captureCrop'),
		id       : 'gyazoCapture',
		contexts : ['all']
	});
	chrome.contextMenus.create({
		title    : chrome.i18n.getMessage('capturePage'),
		id       : 'gyazoWhole',
		contexts : ['all']
	});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var messageHandlers = {
		gyazoCapture: function() {
			onClickHandler({
				menuItemId : 'gyazoCapture'
			}, request.tab);
		},
		gyazoWholeCaptureFromPopup: function() {
			onClickHandler({
				menuItemId : 'gyazoWhole'
			}, request.tab);
		},
		gyazoCaptureSize: function() {
			chrome.tabs.captureVisibleTab(null, {
				format  : 'png'
			}, function(data) {
				var d = request.data;

				canvasUtils.trimImage({
					imageData : data,
					scale     : d.s,
					zoom      : d.z,
					startX    : d.x,
					startY    : d.y,
					width     : d.w,
					height    : d.h,
					callback  : function(canvas) {
						postToGyazo({
							imageData : canvas.toDataURL('image/png'),
							width     : d.w,
							height    : d.h,
							title     : d.t,
							url       : d.u
						});
					}
				});
			});
		},
		wholeCaptureManager: function() {
			if (request.data.scrollPositionY + request.data.windowInnerHeight < request.data.height) {
				chrome.tabs.captureVisibleTab(request.context.winId, {
					format : 'png'
				}, function(data) {
					var canvas = request.canvasData || document.createElement('canvas');

					canvasUtils.appendImageToCanvas({
						canvasData  : canvas,
						imageSrc    : data,
						pageHeight  : request.data.height,
						imageHeight : request.data.captureButtom - request.data.captureTop,
						width       : request.data.width,
						top         : request.data.captureTop,
						scale       : request.data.scale,
						zoom        : request.data.zoom,
						callback    : function(canvas) {
							chrome.tabs.sendMessage(request.context.tabId, {
								action     : 'scrollNextPage',
								canvasData : canvas.toDataURL('image/png'),
								data       : request.data,
								context    : request.context
							});
						}
					});
				});
			} else {
				chrome.tabs.captureVisibleTab(request.context.winId, {
					format : 'png'
				}, function(data) {
					var sh = request.data.height - request.data.scrollPositionY,
					    sy = request.data.windowInnerHeight - sh;

					canvasUtils.trimImage({
						imageData : data,
						startX    : 0,
						startY    : sy,
						width     : request.data.width,
						height    : sh,
						scale     : request.data.scale,
						zoom      : request.data.zoom,
						callback  : function(canvas) {
							canvasUtils.appendImageToCanvas({
								canvasData  : request.canvasData || document.createElement('canvas'),
								imageSrc    : canvas.toDataURL('image/png'),
								pageHeight  : request.data.height,
								imageHeight : request.data.windowInnerHeight,
								width       : request.data.width,
								top         : request.data.captureTop,
								scale       : request.data.scale,
								zoom        : request.data.zoom,
								callback    : function(canvas) {
									chrome.notifications.clear(request.context.notificationId, function(){});

									postToGyazo({
										imageData : canvas.toDataURL('image/png'),
										title     : request.data.title,
										url       : request.data.url,
										width     : request.data.width,
										height    : request.data.height,
										scale     : request.data.scale
									});

									chrome.tabs.sendMessage(request.context.tabId, {
										action  : 'wholeCaptureFinish',
										context : request.context
									});
								}
							});
						}
					});
				});
			}
		}
	}

	if (request.action in messageHandlers) {
		messageHandlers[request.action]();
	}
})

function tabUpdateListener(tabId, changeInfo, tab) {
	saveToClipboard(changeInfo.url);
}