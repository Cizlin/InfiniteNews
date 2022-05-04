import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(SpartanIdConstants.SPARTAN_ID_KEY);
});