import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as CoreSetupFunctions from 'public/CoreSetup.js';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(function() {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			CoreSetupFunctions.coreSetup($item, itemData, ArmorConstants.ARMOR_KEY);
		});
	});
});