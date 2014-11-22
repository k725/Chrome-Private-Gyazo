$(function() {
	$('.i18n').each(function() {
		var i18n = this;
		$(i18n).text(chrome.i18n.getMessage($(i18n).data('text')));
	});
});