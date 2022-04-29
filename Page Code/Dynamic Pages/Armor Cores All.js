// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
//import {session} from 'wix-storage';
import {ANY_ARMOR_CORE_ID, ARMOR_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
//import {URL_ARMOR_SOCKETS} from 'public/URLConstants.js';
import {coreSetup} from 'public/CoreSetup.js';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(function() {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			coreSetup($item, itemData, ARMOR_CUSTOMIZATION_SECTION);
		});
	});
});