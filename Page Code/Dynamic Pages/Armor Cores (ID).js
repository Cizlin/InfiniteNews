import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as ArmorConstants from 'public/Constants/ArmorConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(ArmorConstants.ARMOR_KEY, true);
});