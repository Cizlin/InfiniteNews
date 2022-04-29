import {initialItemSetup} from 'public/ItemSetup.js';
import {VEHICLE_CUSTOMIZATION_SECTION} from 'public/KeyConstants.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	initialItemSetup(VEHICLE_CUSTOMIZATION_SECTION);
});