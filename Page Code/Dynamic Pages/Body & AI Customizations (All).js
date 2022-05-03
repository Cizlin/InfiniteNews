import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as ItemListSetup from 'public/ItemListSetup.js';

$w.onReady(function () {
	ItemListSetup.initialItemListSetup(BodyAndAiConstants.BODY_AND_AI_KEY);
});