// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import {VEHICLE_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
import {initialItemListSetup} from 'public/ItemListSetup.js';

$w.onReady(function () {
	initialItemListSetup(VEHICLE_CUSTOMIZATION_SECTION);
});