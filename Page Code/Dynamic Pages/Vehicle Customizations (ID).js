import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(VehicleConstants.VEHICLE_KEY);
});