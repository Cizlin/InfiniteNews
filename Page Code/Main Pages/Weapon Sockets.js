import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	let weaponCoreID = SocketSetupFunctions.initialSocketSetup(WeaponConstants.WEAPON_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			SocketSetupFunctions.socketItemSetup($item, itemData, WeaponConstants.WEAPON_KEY, weaponCoreID);
		});
	});
});