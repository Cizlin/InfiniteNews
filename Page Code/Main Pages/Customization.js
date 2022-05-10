import {session} from 'wix-storage';
import wixData from 'wix-data';

import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

$w.onReady(function () {
	//#region Resetting session values for each filter.
    // Reset the session values for each of the filters on the item list pages.
	session.setItem(KeyConstants.QUALITY_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.AVAILABLE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.RELEASE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.QUICK_SEARCH_KEY, KeyConstants.DEFAULT_QUICK_SEARCH_VALUE);
	session.setItem(KeyConstants.TIMEFRAME_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.SHOP_TYPE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);

	wixData.query(CustomizationConstants.SOURCE_TYPE_DB)
        .find()
        .then((results) => {
			results.items.forEach((value) => {
				session.setItem(value[CustomizationConstants.SOURCE_TYPE_NAME_FIELD], String(true)); // We use a default value of "true" for each data source.
				//console.log(value.name);
			});
        });
    //#endregion

	// Click "Preview" to run your code
	$w("#repeater1").forEachItem(($item, itemData, index) => { 
		// This content is static, so after changing the fitMode, we need to refresh the image source to refit it.
		$item("#image2").fitMode = "fit";
		$item("#image2").src = $item("#image2").src;
		//console.log($item("#button1").link);
    	//console.log("Mode of the image is: " + mode)
	});
});