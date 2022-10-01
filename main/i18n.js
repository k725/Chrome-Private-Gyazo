document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.i18n').forEach(elm => {
		elm.innerText = chrome.i18n.getMessage(elm.dataset.text);
	});
});