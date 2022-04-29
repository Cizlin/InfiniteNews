// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import {WEAPON_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
import {initialSocketSetup, socketItemSetup} from 'public/SocketSetup.js';

$w.onReady(function () {
	let weaponCoreID = initialSocketSetup(WEAPON_CUSTOMIZATION_SECTION);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			socketItemSetup($item, itemData, WEAPON_CUSTOMIZATION_SECTION, weaponCoreID);
		});
	});
});