import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

$w.onReady(function () {
	$w("#listRepeater").onItemReady(($item, itemData) => {
		$item("#effectVideoPlayer").collapse();
		$item("#effectVideoPlayer").hide();

		let currentItem = itemData;

		if (currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[WeaponConstants.WEAPON_KEY].CustomizationEffectVideoField]) {
			console.log("Showing video and hiding image.");
			$item("#effectVideoPlayer").src = currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[WeaponConstants.WEAPON_KEY].CustomizationEffectVideoField];
			$item("#image").collapse();
			$item("#image").hide();
			$item("#effectVideoPlayer").expand();
			$item("#effectVideoPlayer").show();
		}
	});

	ItemListSetupFunctions.initialItemListSetup(WeaponConstants.WEAPON_KEY);
});
