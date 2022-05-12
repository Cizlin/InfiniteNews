import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	SocketSetupFunctions.initialSocketSetup(ArmorConstants.ARMOR_ATTACHMENT_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => {
			SocketSetupFunctions.socketItemSetup($item, itemData, ArmorConstants.ARMOR_ATTACHMENT_KEY, ""); // Passing an empty string for the core ID.
		});
	});
});