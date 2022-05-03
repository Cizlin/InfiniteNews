import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as ItemListSetup from 'public/Constants/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetup.initialItemListSetup(ConsumablesConstants.CONSUMABLES_KEY);
});