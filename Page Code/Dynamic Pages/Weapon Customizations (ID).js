import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

$w.onReady(function () {
	$w("#effectVideoPlayer").collapse();
	$w("#effectVideoPlayer").hide();

	$w("#dynamicDatasetItem").onReady(() => {
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem();

		if (currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[WeaponConstants.WEAPON_KEY].CustomizationEffectVideoField]) {
			console.log("Showing video and hiding image.")
			$w("#itemImage").collapse();
			$w("#itemImage").hide();
			$w("#effectVideoPlayer").expand();
			$w("#effectVideoPlayer").show();
		}
	});

	ItemSetupFunctions.initialItemSetup(WeaponConstants.WEAPON_KEY);
});
