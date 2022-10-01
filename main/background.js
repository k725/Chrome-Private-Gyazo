import { canvasUtils, saveToClipboard, getCurrentTabId, toBlob, canvasToBase64 } from './functions.js';

const uploadNotification = function (callback) {
	this.progress = 3;
	this.limitValues = [30, 80];
	this.limitLevel = 0;
	this.limit = this.limitValues[this.limitLevel];
	this.id = `gyazoModoki_notification_${Date.now()}`;
	this.newTabId = null;
	callback = callback || function () { };

	this.nextLimit = function () {
		if (this.limitLevel + 1 < this.limitValues.length) {
			this.limitLevel += 1;
		}
		this.limit = this.limitValues[this.limitLevel];
	};

	this.progressIncrement = function (callback) {
		const INCREMENT_SIZE = 5;
		this.progress = Math.min(this.progress + INCREMENT_SIZE, this.limit);
		this.update({ progress: this.progress }, callback);
	};

	this.update = function (opt, callback) {
		callback = callback || function () { };
		chrome.notifications.update(this.id, opt, callback);
	};

	this.finish = function (callback) {
		var self = this;
		this.update({
			title: chrome.i18n.getMessage('uploadingFinishTitle'),
			message: chrome.i18n.getMessage('uploadingFinishMessage'),
			progress: 100,
		}, () => setTimeout(chrome.notifications.clear(self.id, () => { }), 1200));
	};

	chrome.notifications.create(this.id, {
		type: 'progress',
		title: chrome.i18n.getMessage('uploadingServer'),
		message: chrome.i18n.getMessage('uploadingServerMessage'),
		progress: this.progress,
		iconUrl: '/icons/icon_256.png',
		priority: 2,
	}, callback);
};

const postToGyazo = async (data) => {
	chrome.storage.sync.get([
		'optionsServerUploadUrl',
		'optionsServerUsername',
		'optionsServerPassword',
		'optionsOtherClipCopy',
		'optionsOtherUploadCompTab',
	], async (items) => {
		if (chrome.extension.lastError === void 0) {
			if (
				items.optionsServerUploadUrl === void 0 ||
				!items.optionsServerApiType === void 0 ||
				!items.optionsOtherUploadCompTab === void 0
			) {
				alert(chrome.i18n.getMessage('uploadingServerEmpty'));
				return false;
			}

			await uploadImage(data, {
				optionsServerUploadUrl: items.optionsServerUploadUrl,
				optionsServerUsername: items.optionsServerUsername,
				optionsServerPassword: items.optionsServerPassword,
				optionsOtherClipCopy: items.optionsOtherClipCopy,
				optionsOtherUploadCompTab: items.optionsOtherUploadCompTab,
			});
		} else {
			alert(`Error: ${chrome.extension.lastError}`);
		}
	});
}

const uploadImage = async (data, options) => {
	const notification = new uploadNotification();

	const timerId = setInterval(function () {
		notification.progressIncrement();
	}, 500);

	const formData = new FormData();
	formData.append('imagedata', toBlob(data.imageData));

	const headers = new Headers();
	if (options.optionsServerUsername !== '' && options.optionsServerPassword !== '') {
		headers.set('Authorization', 'Basic ' + btoa(`${options.optionsServerUsername}:${options.optionsServerPassword}`));
	}

	const dataUrl = await fetch(options.optionsServerUploadUrl, {
		method: 'POST',
		body: formData,
		headers: headers,
	}).then(res => res.text()).catch((e) => alert(e));

	const callback = (newTab) => {
		notification.nextLimit();
		notification.newTabId = newTab.id;

		const handler = async (tabId, changeInfo) => {
			if (newTab.id === tabId && changeInfo.url) {
				notification.finish();
				clearInterval(timerId);

				if (options.optionsOtherClipCopy) {
					await saveToClipboard(changeInfo.url);
				}

				chrome.tabs.onUpdated.removeListener(handler);
				notification.newTabId = tabId;
			}
		};
		chrome.tabs.onUpdated.addListener(handler);
	};

	if (['optionsOtherUploadCompTabNewBackground', 'optionsOtherUploadCompTabNewOpen'].includes(options.optionsOtherUploadCompTab)) {
		chrome.tabs.create({
			url: dataUrl,
			active: options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewOpen',
		}, callback);
	} else if (['optionsOtherUploadCompTabNewRightBackground', 'optionsOtherUploadCompTabNewRightOpen'].includes(options.optionsOtherUploadCompTab)) {
		chrome.tabs.getSelected(null, (tab) => {
			chrome.tabs.create({
				url: dataUrl,
				index: tab.index + 1,
				active: options.optionsOtherUploadCompTab === 'optionsOtherUploadCompTabNewRightOpen',
			}, callback);
		});
	}
}

const onClickHandler = async (info, tab) => {
	const gyazoFuncs = {
		gyazoIt: async () => {
			if (info.srcUrl.startsWith('data:')) {
				await postToGyazo({
					imageData: info.srcUrl,
					title: tab.title,
					url: tab.url,
				});
				return;
			}

			await fetch(info.srcUrl).then(response => response.blob()).then(data => {
				const fileReader = new FileReader();
				fileReader.onload = async (e) => {
					await postToGyazo({
						imageData: fileReader.result,
						title: tab.title,
						url: tab.url,
					});
				};
				fileReader.readAsDataURL(data);
			});
		},
		gyazoCapture: () => {
			chrome.tabs.sendMessage(tab.id, { action: 'gyazoCapture' });
		},
		gyazoWhole: () => {
			const notificationId = 'gyazoModokiCapturing_' + Date.now();

			chrome.notifications.create(notificationId, {
				type: 'basic',
				title: chrome.i18n.getMessage('capturingWindow'),
				message: chrome.i18n.getMessage('capturingWindowMessage'),
				iconUrl: '/icons/icon_256.png',
				priority: 2,
			});

			chrome.tabs.sendMessage(tab.id, {
				action: 'wholeCaptureInit',
				data: {},
				context: {
					tabId: tab.id,
					winId: tab.windowId,
					notificationId: notificationId,
				},
			});
		}
	};

	if (info.menuItemId in gyazoFuncs) {
		const tabId = await getCurrentTabId();
		await chrome.scripting.executeScript({
			target: { tabId: tabId },
			files: ['/main/content.js'],
		}, () => gyazoFuncs[info.menuItemId]());
	}
}

const onLickHandler = async (request, sender, sendResponse) => {
	const messageHandlers = {
		gyazoCapture: () => onClickHandler({ menuItemId: 'gyazoCapture' }, request.tab),
		gyazoWholeCaptureFromPopup: () => onClickHandler({ menuItemId: 'gyazoWhole' }, request.tab),
		gyazoCaptureSize: () => {
			chrome.tabs.captureVisibleTab(null, {
				format: 'png'
			}, (data) => {
				canvasUtils.trimImage({
					imageData: data,
					scale: request.data.s,
					zoom: request.data.z,
					startX: request.data.x,
					startY: request.data.y,
					width: request.data.w,
					height: request.data.h,
					callback: async (canvas) => {
						await postToGyazo({
							imageData: await canvasToBase64(canvas),
							width: request.data.w,
							height: request.data.h,
							title: request.data.t,
							url: request.data.u,
						});
					},
				});
			});
		},
		wholeCaptureManager: () => {
			if (request.data.scrollPositionY + request.data.windowInnerHeight < request.data.height) {
				chrome.tabs.captureVisibleTab(request.context.winId, {
					format: 'png'
				}, async (data) => {
					const canvas = request.canvasData || new OffscreenCanvas(request.data.width, request.data.height);

					await new Promise(r => setTimeout(r, 1000 / (chrome.tabs.MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND ?? 2)));

					canvasUtils.appendImageToCanvas({
						canvasData: canvas,
						imageSrc: data,
						pageHeight: request.data.height,
						imageHeight: request.data.captureButtom - request.data.captureTop,
						width: request.data.width,
						top: request.data.captureTop,
						scale: request.data.scale,
						zoom: request.data.zoom,
						callback: async (canvas) => {
							chrome.tabs.sendMessage(request.context.tabId, {
								action: 'scrollNextPage',
								canvasData: await canvasToBase64(canvas),
								data: request.data,
								context: request.context,
							});
						},
					});
				});
			} else {
				chrome.tabs.captureVisibleTab(request.context.winId, {
					format: 'png'
				}, (data) => {
					const sh = request.data.height - request.data.scrollPositionY,
						sy = request.data.windowInnerHeight - sh;

					canvasUtils.trimImage({
						imageData: data,
						startX: 0,
						startY: sy,
						width: request.data.width,
						height: sh,
						scale: request.data.scale,
						zoom: request.data.zoom,
						callback: async (canvas) => {
							canvasUtils.appendImageToCanvas({
								canvasData: request.canvasData || new OffscreenCanvas(request.data.width, request.data.height),
								imageSrc: await canvasToBase64(canvas),
								pageHeight: request.data.height,
								imageHeight: request.data.windowInnerHeight,
								width: request.data.width,
								top: request.data.captureTop,
								scale: request.data.scale,
								zoom: request.data.zoom,
								callback: async (canvas) => {
									chrome.notifications.clear(request.context.notificationId, () => { });

									await postToGyazo({
										imageData: await canvasToBase64(canvas),
										title: request.data.title,
										url: request.data.url,
										width: request.data.width,
										height: request.data.height,
										scale: request.data.scale,
									});

									chrome.tabs.sendMessage(request.context.tabId, {
										action: 'wholeCaptureFinish',
										context: request.context,
									});
								},
							});
						},
					});
				});
			}
		},
	}

	if (request.action in messageHandlers) {
		messageHandlers[request.action]();
	}
}

const registerContextMenus = async () => {
	await chrome.contextMenus.removeAll();

	chrome.contextMenus.create({
		title: chrome.i18n.getMessage('captureImage'),
		id: 'gyazoIt',
		contexts: ['image'],
	});
	chrome.contextMenus.create({
		title: chrome.i18n.getMessage('captureCrop'),
		id: 'gyazoCapture',
		contexts: ['all'],
	});
	chrome.contextMenus.create({
		title: chrome.i18n.getMessage('capturePage'),
		id: 'gyazoWhole',
		contexts: ['all'],
	});
};

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);
chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.runtime.onMessage.addListener(onLickHandler);
