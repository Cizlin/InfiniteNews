import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(WeaponConstants.WEAPON_KEY, true);
});