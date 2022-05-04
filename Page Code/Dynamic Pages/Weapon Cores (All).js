import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as CoreSetupFunctions from 'public/CoreSetup.js';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(function() {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			CoreSetupFunctions.coreSetup($item, itemData, WeaponConstants.WEAPON_KEY);
		});
	});
});