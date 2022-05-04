import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(BodyAndAiConstants.BODY_AND_AI_KEY);
});