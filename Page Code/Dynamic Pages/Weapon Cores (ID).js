import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as WeaponConstants from 'public/WeaponConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(WeaponConstants.WEAPON_KEY, true);
});