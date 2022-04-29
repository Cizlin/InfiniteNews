// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import {BODY_AND_AI_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
import {initialSocketSetup, socketItemSetup} from 'public/SocketSetup.js';

$w.onReady(function () {
	initialSocketSetup(BODY_AND_AI_CUSTOMIZATION_SECTION);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			socketItemSetup($item, itemData, BODY_AND_AI_CUSTOMIZATION_SECTION, ""); // Passing an empty string for the core ID.
		});
	});
});