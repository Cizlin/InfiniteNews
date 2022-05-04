import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(SpartanIdConstants.SPARTAN_ID_KEY);
});