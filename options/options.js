$(function() {
	// Value restore
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
			$('#optionsServerUploadUrl').val(items.optionsServerUploadUrl || '');
			$('#optionsServerUsername').val(items.optionsServerUsername || '');
			$('#optionsServerPassword').val(items.optionsServerPassword || '');
			$('#optionsServerApiKey').val(items.optionsServerApiKey || '');
			$('#optionsServerApiType').val(items.optionsServerApiType || 'optionsServerUseOldApi');
			$('#optionsOtherClipCopy').attr('checked', items.optionOtherClipCopy || true);
			$('#optionsOtherUploadCompTab').val(items.optionOtherUploadCompTab || 'optionsOtherUploadCompTabNewBackground');
		} else {
			console.log(chrome.extension.lastError);
		}
	});

	// Value save
	$('#optionsSave').click(function() {
		var optionsServerUploadUrl = $('#optionsServerUploadUrl');

		// Todo: Bad Regular expression :P
		if (!optionsServerUploadUrl.val().match(/^https?:\/\/\S+$/)) {
			optionsServerUploadUrl.parents('.form-group').addClass('has-error');
			return;
		}

		chrome.storage.sync.set({
			'optionsServerUploadUrl'    : optionsServerUploadUrl.val(),
			'optionsServerUsername'     : $('#optionsServerUsername').val(),
			'optionsServerPassword'     : $('#optionsServerPassword').val(),
			'optionsServerApiKey'       : $('#optionsServerApiKey').val(),
			'optionsServerApiType'      : $('#optionsServerApiType').val(),
			'optionsOtherClipCopy'      : $('#optionsOtherClipCopy').prop('checked'),
			'optionsOtherUploadCompTab' : $('#optionsOtherUploadCompTab').val()
		}, function() {
			if(chrome.extension.lastError === void 0) {
				window.close();
			} else {
				window.alert(chrome.extension.lastError);
			}
		});
	});

	// Value clear
	$('#optionsReset').click(function() {
		if (window.confirm(chrome.i18n.getMessage('optionResetConfirm'))) {
			chrome.storage.sync.clear(function() {
				if (chrome.extension.lastError !== void 0) {
					window.alert(chrome.extension.lastError);
				}
			});
		}
	});
});