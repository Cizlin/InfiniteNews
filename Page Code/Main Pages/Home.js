import * as KeyConstants from 'public/KeyConstants.js';
import wixData from 'wix-data';
import {initialSocketSetup} from 'public/SocketSetup.js';

// Capstone challenges only have these items as possible rewards.
const CHILD_ITEM_FIELD_NAMES_TO_URL_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: "link-armor-customizations-itemName", 
	[KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD]: "link-armor-customization-attachments-itemName", 
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: "link-items-title",
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: "link-vehicle-customizations-title",
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: "link-body-ai-customizations-itemName-2",
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: "link-presentation-customizations-title"
};

const CHILD_ITEM_FIELD_NAMES_TO_SOCKET_DB_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: KeyConstants.ARMOR_SOCKET_DB,
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: KeyConstants.WEAPON_SOCKET_DB,
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: KeyConstants.VEHICLE_SOCKET_DB,
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: KeyConstants.BODY_AND_AI_SOCKET_DB,
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: KeyConstants.SPARTAN_ID_SOCKET_DB,
}

$w.onReady(async function () {
	initialSocketSetup(KeyConstants.CAPSTONE_CHALLENGE_SECTION); // The choice here is non-specific to the challenges. We just want to differentiate from items with cores.

	$w("#blog1").hide();
	
	$w("#ultimateChallengeDataset").onReady(async () => {
		let ultimateChallenge = $w("#ultimateChallengeDataset").getCurrentItem();
		$w("#ultimateChallengeDescription").text = ultimateChallenge.description + " - " + ultimateChallenge.completionThreshold;
		// Now that we have our current Ultimate Challenge, we need to grab the reward by using the fieldsWithItems field.
		let categoryWithItems = "";
		if (ultimateChallenge.fieldsWithItems.length > 0) {
			categoryWithItems = ultimateChallenge.fieldsWithItems[0]; // We're just going to grab the first category and item for now.
			let queryResults = await wixData.queryReferenced(KeyConstants.CAPSTONE_CHALLENGE_DB, ultimateChallenge._id, categoryWithItems);
			if (queryResults.items.length > 0) {
				ultimateChallenge[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
			}
		} 
		else {
			console.error("No reward categories found for this capstone challenge: " + ultimateChallenge);
			return;
		}

		/*for (let fieldName in CHILD_ITEM_FIELD_NAMES_TO_URL_DICT) {
			let queryResults = await wixData.queryReferenced(KeyConstants.CAPSTONE_CHALLENGE_DB, ultimateChallenge._id, fieldName);
			if (queryResults.items.length > 0) {
				categoryWithItems = fieldName;
				ultimateChallenge[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
				break;
			}
		}*/

		if (ultimateChallenge[categoryWithItems].length > 0) {
			let childItem = ultimateChallenge[categoryWithItems][0]; // We're just grabbing the first item. Can't show more than one.

			let childItemCustomizationType = "Helmet Attachment"; // This is for the Armor Attachment category only.
			if (KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD != categoryWithItems) { // We need to retrieve the customization type.
				let customizationTypeResults = await wixData.query(CHILD_ITEM_FIELD_NAMES_TO_SOCKET_DB_DICT[categoryWithItems])
					.eq("_id", childItem["customizationTypeReference"])
					.find();

				childItemCustomizationType = customizationTypeResults.items[0].name;
			}

			$w("#ultimateChallengeButton").link = childItem[CHILD_ITEM_FIELD_NAMES_TO_URL_DICT[categoryWithItems]];
			$w("#ultimateChallengeImage").src = childItem.image;
			$w("#ultimateChallengeImage").fitMode = "fit";
			$w("#ultimateChallengeRewardText").text = childItem.itemName + " " + childItemCustomizationType;
		}
		else {
			console.error("No rewards found for this capstone challenge: " + ultimateChallenge);
		}
	});

	// Update the Featured Pass listing.
	$w("#passDataset").onReady(async () => {
		let pass = $w("#passDataset").getCurrentItem();
		$w("#passType").text = (pass.isEvent) ? "Event Pass" : "Battle Pass";

		/*let seasonResults = await wixData.query(KeyConstants.RELEASE_DB)
			.eq("_id", pass.season)
			.find();

		$w("#passSeason").text = seasonResults.items[0].release;*/
	});

	// Update the Featured Shop Bundle Listing
	$w("#shopDataset").onReady(() => {
		let shopBundle = $w("#shopDataset").getCurrentItem();
		$w("#shopImage").fitMode = "fit";
		$w("#shopCreditCost").text = "Credits: " + shopBundle.costCredits;
	})
});