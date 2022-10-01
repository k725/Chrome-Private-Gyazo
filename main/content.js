(() => {
	const changeFixedElementToAbsolute = () => {
		Array.prototype.slice.apply(document.querySelectorAll('*')).filter(item => (window.getComputedStyle(item).position === 'fixed')).forEach((item) => {
			item.classList.add('gyazo-whole-capture-onetime-absolute');
			item.style.position = 'absolute';
		});
	};

	const gyazoCaptureAction = () => {
		const data = {},
			tempUserSelect = document.body.style.userSelect,
			layer = document.createElement('div'),
			pageHeight = Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight);
		let startX, startY;

		layer.style.position = 'fixed';
		layer.style.left = `${document.body.clientLeft}px`;
		layer.style.top = `${document.body.clientTop}px`;
		layer.style.width = `${document.body.clientWidth}px`;
		layer.style.height = `${pageHeight}px`;
		layer.style.zIndex = 2147483647; // Maximun number of 32bit Int
		layer.style.cursor = 'crosshair';

		document.body.style.userSelect = 'none';

		const selectionElm = document.createElement('div');

		layer.appendChild(selectionElm);
		document.body.appendChild(layer);

		selectionElm.styleUpdate = (styles) => {
			Object.keys(styles).forEach((key) => {
				selectionElm.style[key] = styles[key];
			});
		};

		selectionElm.styleUpdate({
			background: 'rgba(92, 92, 92, 0.3)',
			position: 'fixed',
		});

		const cancelGyazo = () => {
			document.body.removeChild(layer);
			document.body.style.userSelect = tempUserSelect;
			document.removeEventListener('keydown', keydownHandler);
			window.removeEventListener('contextmenu', cancelGyazo);
		};

		const keydownHandler = (e) => {
			if (e.key === "Escape") {
				cancelGyazo();
			}
		};

		const mousedownHandler = (e) => {
			startX = e.clientX;
			startY = e.clientY;

			selectionElm.styleUpdate({
				border: '1px solid rgba(255, 255, 255, 0.8)',
				left: startX + 'px',
				top: startY + 'px',
			});

			layer.removeEventListener('mousedown', mousedownHandler);
			layer.addEventListener('mousemove', mousemoveHandler);
			layer.addEventListener('mouseup', mouseupHandler);
		};

		const mousemoveHandler = (e) => {
			selectionElm.styleUpdate({
				width: (Math.abs(e.clientX - startX) - 1) + 'px',
				height: (Math.abs(e.clientY - startY) - 1) + 'px',
				left: Math.min(e.clientX, startX) + 'px',
				top: Math.min(e.clientY, startY) + 'px',
			});
		};

		const mouseupHandler = (e) => {
			document.body.style.userSelect = tempUserSelect;
			document.removeEventListener('keydown', keydownHandler);

			window.addEventListener('contextmenu', (event) => {
				cancelGyazo();
				event.preventDefault();
			});

			const zoom = Math.round(window.outerWidth / window.innerWidth * 100) / 100,
				scale = window.devicePixelRatio / zoom;

			data.w = Math.abs(e.clientX - startX);
			data.h = Math.abs(e.clientY - startY);

			if (data.h < 1 || data.w < 1) {
				document.body.removeChild(layer);
				return false;
			}

			data.x = Math.min(e.clientX, startX);
			data.y = Math.min(e.clientY, startY);
			data.t = document.title;
			data.u = location.href;
			data.s = scale;
			data.z = zoom;

			document.body.removeChild(layer);

			//wait for rewrite by removeChild
			window.setTimeout(() => {
				chrome.runtime.sendMessage(chrome.runtime.id, {
					action: 'gyazoCaptureSize',
					data: data,
				}, () => { });
			}, 100);
		};

		layer.addEventListener('mousedown', mousedownHandler);
		document.addEventListener('keydown', keydownHandler);
		window.addEventListener('contextmenu', cancelGyazo);
	};

	const wholeCaptureInitAction = () => {
		const context = request.context;
		context.scrollY = window.scrollY;
		context.overflow = document.documentElement.style.overflow;
		context.overflowY = document.documentElement.style.overflowY;

		document.documentElement.style.overflow = 'hidden';
		document.documentElement.style.overflowY = 'hidden';

		//I want some fixed element not to follow scrolling
		changeFixedElementToAbsolute();
		window.scroll(0, 0);

		const zoom = Math.round(window.outerWidth / window.innerWidth * 100) / 100,
			isWindows = navigator.platform.match(/^win/i),
			isMaximum = (window.outerHeight === screen.availHeight && window.outerWidth === screen.availWidth);

		if (isWindows && !isMaximum && 1.00 < zoom && zoom < 1.05) {
			zoom = 1.00;
		}

		//waiting for repaint after scroll
		window.setTimeout(() => {
			chrome.runtime.sendMessage(chrome.runtime.id, {
				action: 'wholeCaptureManager',
				data: {
					width: window.outerWidth,
					height: Math.max(document.body.clientHeight, document.body.offsetHeight, document.body.scrollHeight),
					windowInnerHeight: window.innerHeight,
					title: document.title,
					url: location.href,
					captureTop: 0,
					captureButtom: window.innerHeight * zoom,
					scrollPositionY: 0,
					scale: window.devicePixelRatio / zoom,
					zoom: zoom,
				},
				context: context,
			});
		}, 50);
	};

	const scrollNextPageAction = () => {
		const data = request.data,
			captureTop = data.captureButtom,
			captureButtom = captureTop + data.windowInnerHeight * data.zoom,
			scrollPositionY = data.scrollPositionY + data.windowInnerHeight;

		window.scroll(0, scrollPositionY);

		data.captureTop = captureTop;
		data.captureButtom = captureButtom;
		data.scrollPositionY = scrollPositionY;

		//I want some fixed element not to follow scrolling
		window.setTimeout(() => {
			changeFixedElementToAbsolute();
			window.setTimeout(() => {
				chrome.runtime.sendMessage(chrome.runtime.id, {
					action: 'wholeCaptureManager',
					canvasData: request.canvasData,
					data: data,
					context: request.context,
				});
			}, 0);
		}, 50);
	};

	const wholeCaptureFinishAction = () => {
		document.documentElement.style.overflow = request.context.overflow;
		document.documentElement.style.overflowY = request.context.overflowY;

		Array.prototype.slice.apply(document.getElementsByClassName('gyazo-whole-capture-onetime-absolute')).forEach((item) => {
			item.classList.remove('gyazo-whole-capture-onetime-absolute');
			item.style.position = 'fixed';
		});

		window.scroll(0, request.context.scrollY);
	};

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		const actions = {
			gyazoCapture: gyazoCaptureAction,
			wholeCaptureInit: wholeCaptureInitAction,
			scrollNextPage: scrollNextPageAction,
			wholeCaptureFinish: wholeCaptureFinishAction,
		};
		if (request.action in actions) {
			actions[request.action]();
		}
	});
})();