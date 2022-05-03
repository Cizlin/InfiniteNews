import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(ConsumablesConstants.CONSUMABLES_KEY);
});