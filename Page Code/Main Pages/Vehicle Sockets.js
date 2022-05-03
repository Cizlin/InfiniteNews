import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	let vehicleCoreID = SocketSetupFunctions.initialSocketSetup(VehicleConstants.VEHICLE_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			SocketSetupFunctions.socketItemSetup($item, itemData, VehicleConstants.VEHICLE_KEY, vehicleCoreID);
		});
	});
});