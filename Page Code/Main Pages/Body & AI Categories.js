import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(function () {
	SocketSetupFunctions.initialSocketSetup(BodyAndAiConstants.BODY_AND_AI_KEY);

	$w("#dynamicDataset").onReady(() => {
		$w("#repeater1").onItemReady(($item, itemData, index) => { 
			SocketSetupFunctions.socketItemSetup($item, itemData, BodyAndAiConstants.BODY_AND_AI_KEY, ""); // Passing an empty string for the core ID.
		});
	});
});