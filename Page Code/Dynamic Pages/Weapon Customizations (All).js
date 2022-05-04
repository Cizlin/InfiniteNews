import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(WeaponConstants.WEAPON_KEY);
});