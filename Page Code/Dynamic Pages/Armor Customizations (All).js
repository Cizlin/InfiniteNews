import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';

$w.onReady(function () {
	$w("#listRepeater").onItemReady(($item, itemData) => {
		$item("#effectVideoPlayer").collapse();
		$item("#effectVideoPlayer").hide();

		let currentItem = itemData;

		if (currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ArmorConstants.ARMOR_KEY].CustomizationEffectVideoField]) {
			console.log("Showing video and hiding image.");
			$item("#effectVideoPlayer").src = currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ArmorConstants.ARMOR_KEY].CustomizationEffectVideoField];
			$item("#image").collapse();
			$item("#image").hide();
			$item("#effectVideoPlayer").expand();
			$item("#effectVideoPlayer").show();
		}
	});

	ItemListSetupFunctions.initialItemListSetup(ArmorConstants.ARMOR_KEY);
});
