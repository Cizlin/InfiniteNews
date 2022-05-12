import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(ArmorConstants.ARMOR_ATTACHMENT_KEY);
});