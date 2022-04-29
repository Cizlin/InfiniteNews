// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import {SPARTAN_ID_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
import {initialSocketSetup, socketItemSetup} from 'public/SocketSetup.js';

$w.onReady(function () {
	initialSocketSetup(SPARTAN_ID_CUSTOMIZATION_SECTION);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			socketItemSetup($item, itemData, SPARTAN_ID_CUSTOMIZATION_SECTION, ""); // Passing an empty string for the core ID.
		});
	});
});