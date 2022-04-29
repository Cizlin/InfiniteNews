// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import {VEHICLE_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
import {coreSetup} from 'public/CoreSetup.js';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(function() {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			coreSetup($item, itemData, VEHICLE_CUSTOMIZATION_SECTION);
		});
	});
});