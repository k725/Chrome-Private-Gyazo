const imageLoader = (imgSrc) => {
	return new Promise((resolve, reject) => {
		fetch(imgSrc).then(res => res.blob()).then(blob => {
			createImageBitmap(blob).then(r => resolve(r)).catch(r => reject(r));
		});
	});
};

export const canvasToBase64 = async (canvas) => {
	const blob = await canvas.convertToBlob();
	return new Promise((resove, reason) => {
		const reader = new FileReader();
		reader.onload = () => {
			resove('data:image/png;base64,' + reader.result.split(',')[1]);
		};
		reader.readAsDataURL(blob);
	});
};

export const toBlob = (base64) => {
	const binary = atob(base64.replace(/^.*,/, ''));

	let buffer = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		buffer[i] = binary.charCodeAt(i);
	}

	return new Blob([buffer.buffer], {
		type: 'image/png',
	});
};

export const getCurrentTabId = async () => {
	const [tab] = await chrome.tabs.query({
		currentWindow: true,
		active: true,
	});
	return tab.id;
};

export const saveToClipboard = async (str) => {
	const tabId = await getCurrentTabId();
	chrome.scripting.executeScript({
		target: { tabId: tabId },
		func: (str) => navigator.clipboard.writeText(str),
		args: [str],
	});
};

export const canvasUtils = {
	appendImageToCanvas: async function (argObj) {
		let scale = argObj.scale || 1.0,
			zoom = argObj.zoom || 1.0,
			canvasData = argObj.canvasData,
			imageSrc = argObj.imageSrc,
			pageHeight = argObj.pageHeight * zoom,
			imageHeight = argObj.imageHeight,
			width = argObj.width,
			top = argObj.top,
			callback = argObj.callback;

		// If 1st argument is Object (maybe <canvas>), convert to dataURL.
		if (typeof canvasData === 'object') {
			canvasData = await canvasToBase64(canvasData.getContext('2d').canvas);
		}

		const offcan = new OffscreenCanvas(width, pageHeight);
		const ctx = offcan.getContext('2d');

		const image = await imageLoader(canvasData);
		ctx.drawImage(image, 0, 0);

		const image2 = await imageLoader(imageSrc);
		ctx.drawImage(image2, 0, 0, width * scale, imageHeight * scale, 0, top, width, imageHeight);

		callback(offcan);
	},
	trimImage: async (argObj) => {
		const scale = argObj.scale || 1.0,
			imageData = argObj.imageData,
			startX = argObj.startX * scale,
			startY = argObj.startY * scale,
			width = argObj.width * scale,
			height = argObj.height * scale,
			callback = argObj.callback || function () { };

		if (typeof imageData === 'string' && imageData.startsWith('data:')) {
			const image = await imageLoader(imageData);

			const offcan = new OffscreenCanvas(width, height);

			const ctx = offcan.getContext('2d');

			ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height);
			callback(offcan);
		}
	},
};