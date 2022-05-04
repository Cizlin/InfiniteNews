
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(ShopConstants.SHOP_KEY);
});