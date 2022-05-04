import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetupFunctions.initialItemListSetup(VehicleConstants.VEHICLE_KEY);
});