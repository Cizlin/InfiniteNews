import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(KeyConstants.TWITCH_DROPS_KEY);
});
