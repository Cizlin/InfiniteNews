import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	SocketSetupFunctions.initialSocketSetup(SpartanIdConstants.SPARTAN_ID_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			SocketSetupFunctions.socketItemSetup($item, itemData, SpartanIdConstants.SPARTAN_ID_KEY, ""); // Passing an empty string for the core ID.
		});
	});
});