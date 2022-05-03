import * as PassConstants from 'public/Constants/PassConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(PassConstants.PASS_KEY);
});