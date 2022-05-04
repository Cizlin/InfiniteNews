import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as CoreSetupFunctions from 'public/CoreSetup.js';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(function() {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			CoreSetupFunctions.coreSetup($item, itemData, VehicleConstants.VEHICLE_KEY);
		});
	});
});