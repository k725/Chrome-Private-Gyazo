$(function() {
	// Value restore
	$('#optionsServerUploadUrl').val(localStorage.getItem('optionsServerUploadUrl') || '');
	$('#optionsServerUsername').val(localStorage.getItem('optionsServerUsername') || '');
	$('#optionsServerPassword').val(localStorage.getItem('optionsServerPassword') || '');
	$('#optionsServerApiKey').val(localStorage.getItem('optionsServerApiKey') || '');

	if (localStorage['optionOtherClipCopy'] === 'true') {
		$("#optionOtherClipCopy").attr('checked', true);
	}

	if (localStorage['optionOtherUploadCompTab'] !== void 0) {
		$('#'+localStorage['optionOtherUploadCompTab']).attr("checked", true);
	}

	// Value save
	$('#optionSave').click(function(){
		localStorage.setItem('optionsServerUploadUrl', $('#optionsServerUploadUrl').val());
		localStorage.setItem('optionsServerUsername', $('#optionsServerUsername').val());
		localStorage.setItem('optionsServerPassword', $('#optionsServerPassword').val());
		localStorage.setItem('optionsServerApiKey', $('#optionsServerApiKey').val());
		localStorage.setItem('optionOtherClipCopy', $('#optionOtherClipCopy').prop('checked'));
		localStorage.setItem('optionOtherUploadCompTab', $('input[name="optionOtherUploadCompTab"]:checked').attr('id'));

		window.close();
	});

	// Value clear
	$('#optionReset').click(function() {
		if(window.confirm(chrome.i18n.getMessage('optionResetConfirm'))){
			localStorage.clear();
		}
	});
});