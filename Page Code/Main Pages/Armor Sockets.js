import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	let armorCoreID = SocketSetupFunctions.initialSocketSetup(ArmorConstants.ARMOR_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			SocketSetupFunctions.socketItemSetup($item, itemData, ArmorConstants.ARMOR_KEY, armorCoreID);
		});
	});
});