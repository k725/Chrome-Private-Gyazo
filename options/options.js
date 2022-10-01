$(() => {
	// Value restore
	chrome.storage.sync.get([
		'optionsServerUploadUrl',
		'optionsServerUsername',
		'optionsServerPassword',
		'optionsOtherClipCopy',
		'optionsOtherUploadCompTab'
	], (items) => {
		if (chrome.extension.lastError === void 0) {
			$('#optionsServerUploadUrl').val(items.optionsServerUploadUrl || '');
			$('#optionsServerUsername').val(items.optionsServerUsername || '');
			$('#optionsServerPassword').val(items.optionsServerPassword || '');
			$('#optionsOtherClipCopy').attr('checked', items.optionOtherClipCopy || true);
			$('#optionsOtherUploadCompTab').val(items.optionOtherUploadCompTab || 'optionsOtherUploadCompTabNewBackground');
		} else {
			console.log(chrome.extension.lastError);
		}
	});

	// Value save
	$('#optionsSave').click(() => {
		var optionsServerUploadUrl = $('#optionsServerUploadUrl');

		// Todo: Bad Regular expression :P
		if (!optionsServerUploadUrl.val().match(/^https?:\/\/\S+$/)) {
			optionsServerUploadUrl.parents('.form-group').addClass('has-error');
			return;
		}

		chrome.storage.sync.set({
			'optionsServerUploadUrl': optionsServerUploadUrl.val(),
			'optionsServerUsername': $('#optionsServerUsername').val(),
			'optionsServerPassword': $('#optionsServerPassword').val(),
			'optionsOtherClipCopy': $('#optionsOtherClipCopy').prop('checked'),
			'optionsOtherUploadCompTab': $('#optionsOtherUploadCompTab').val()
		}, () => {
			if (chrome.extension.lastError === void 0) {
				window.close();
			} else {
				window.alert(chrome.extension.lastError);
			}
		});
	});

	// Value clear
	$('#optionsReset').click(() => {
		if (window.confirm(chrome.i18n.getMessage('optionResetConfirm'))) {
			chrome.storage.sync.clear(() => {
				if (chrome.extension.lastError !== void 0) {
					window.alert(chrome.extension.lastError);
				}
			});
		}
	});
});