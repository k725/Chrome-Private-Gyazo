function imageLoader(imgSrc, callback) {
	var img = new Image();

	img.src    = imgSrc;
	img.onload = function() {
		callback(img);
	};
}

function saveToClipboard(str) {
	var textArea = document.createElement('textarea');

	textArea.style.cssText = 'position:absolute;left:-100%';
	textArea.value         = str;

	document.body.appendChild(textArea);
	textArea.select();
	document.execCommand('copy');
	document.body.removeChild(textArea);
}

var canvasUtils = {
	appendImageToCanvas: function(argObj) {
		var scale       = argObj.scale || 1.0,
		    zoom        = argObj.zoom || 1.0,
		    canvasData  = argObj.canvasData,
		    imageSrc    = argObj.imageSrc,
		    pageHeight  = argObj.pageHeight * zoom,
		    imageHeight = argObj.imageHeight,
		    width       = argObj.width,
		    top         = argObj.top,
		    callback    = argObj.callback;

		// If 1st argument is Object (maybe <canvas>), convert to dataURL.
		if (typeof canvasData === 'object') {
			canvasData = canvasData.toDataURL();
		}

		var canvas = document.createElement('canvas');

		canvas.width  = width;
		canvas.height = pageHeight;

		var ctx = canvas.getContext('2d');

		imageLoader(canvasData, function(img) {
			ctx.drawImage(img, 0, 0);
			imageLoader(imageSrc, function(img) {
				ctx.drawImage(img, 0, 0, width * scale, imageHeight * scale, 0, top, width * scale, imageHeight * scale);
				callback(canvas);
			});
		});
	},
	trimImage: function(argObj) {
		var scale     = argObj.scale  || 1.0,
		    zoom      = argObj.zoom || 1.0,
		    imageData = argObj.imageData,
		    startX    = argObj.startX * zoom,
		    startY    = argObj.startY * zoom,
		    width     = argObj.width * zoom,
		    height    = argObj.height * zoom,
		    callback  = argObj.callback || function(){};

		if (typeof imageData === 'string' && imageData.substr(0, 5) === 'data:') {
			imageLoader(imageData, function(img) {

				var canvas = document.createElement('canvas');

				canvas.width  = width;
				canvas.height = height;

				var ctx = canvas.getContext('2d');

				ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height);
				callback(canvas);
			});
		} else if (typeof imageData === 'object') {
			//maybe <canvas>
			this.appendImageToCanvas({
				canvasData  : document.createElement('canvas'),
				imageSrc    : imageData,
				pageHeight  : height,
				imageHeight : height,
				width       : width,
				top         : 0,
				scale       : scale,
				zoom        : zoom,
				callback    : function(canvas) {
					var ctx            = canvas.getContext('2d'),
					    originalWidth  = width,
					    originalHeight = height;

					startX *= scale;
					startY *= scale;
					height *= scale * zoom;
					width  *= scale * zoom;

					imageLoader(canvas.toDataURL('image/png'), function(img) {
						ctx.drawImage(img, startX, startY, width, height, 0, 0, originalWidth, originalHeight);
						callback(canvas);
					});
				}
			});
		}
	}
}