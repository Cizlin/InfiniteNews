import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as ArmorConstants from 'public/Constants/ArmorConstants.js';

import wixData from 'wix-data';

import * as SocketSetupFunctions from 'public/SocketSetup.js';

// Capstone challenges only have these items as possible rewards.
/*const CHILD_ITEM_FIELD_NAMES_TO_URL_DICT = {
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
}*/

$w.onReady(async function () {
	// The choice here is non-specific to the challenges. We could also use Shop Key or anything else that doesn't have cores.
	// The goal is to refresh the saved session data for our filters and search.
	SocketSetupFunctions.initialSocketSetup(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY); 

	$w("#blog1").hide();
	
	$w("#ultimateChallengeDataset").onReady(async () => {
		let ultimateChallenge = $w("#ultimateChallengeDataset").getCurrentItem();
		$w("#ultimateChallengeDescription").text = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] + " - " +
			ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD];

		// Now that we have our current Ultimate Challenge, we need to grab the reward by using the fieldsWithItems field.
		let categoryWithItems = "";
		if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD].length > 0) {
			categoryWithItems = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0]; // We're just going to grab the first category and item for now.
			let queryResults = await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, ultimateChallenge._id, categoryWithItems);
			if (queryResults.items.length > 0) {
				ultimateChallenge[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
			}
		}
		else {
			console.error("No reward categories found for this capstone challenge: " + ultimateChallenge);
			return;
		}

		const CUSTOMIZATION_CATEGORY = CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[categoryWithItems];

		if (ultimateChallenge[categoryWithItems].length > 0) {
			let childItem = ultimateChallenge[categoryWithItems][0];

			let childItemCustomizationType = "Helmet Attachment"; // This is for the Armor Attachment category only. TODO: Improve this.
			if (ArmorConstants.ARMOR_ATTACHMENT_KEY != CUSTOMIZATION_CATEGORY) {
				// We need to retrieve the customization type. Soon will do this for all items including attachments.
				const SOCKET_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationDb;
				const CUSTOMIZATION_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSocketReferenceField;
				const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].SocketNameField;

				let customizationTypeResults = await wixData.query(SOCKET_DB)
					.eq("_id", childItem[CUSTOMIZATION_TYPE_REFERENCE_FIELD])
					.find();

				childItemCustomizationType = customizationTypeResults.items[0][SOCKET_NAME_FIELD];
			}

			const CUSTOMIZATION_URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationUrlField;
			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationImageField;
			const CUSTOMIZATION_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationNameField;

			$w("#ultimateChallengeButton").link = childItem[CUSTOMIZATION_URL_FIELD];
			$w("#ultimateChallengeImage").src = childItem[CUSTOMIZATION_IMAGE_FIELD];
			$w("#ultimateChallengeImage").fitMode = "fit";
			$w("#ultimateChallengeRewardText").text = childItem[CUSTOMIZATION_NAME_FIELD] + " " + childItemCustomizationType;
		}
		else {
			console.error("No rewards found for this capstone challenge: " + ultimateChallenge);
		}

		/*// Now that we have our current Ultimate Challenge, we need to grab the reward by using the fieldsWithItems field.
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
		}*/
	});

	// Update the Featured Pass listing.
	$w("#passDataset").onReady(async () => {
		let pass = $w("#passDataset").getCurrentItem();
		$w("#passType").text = (pass[PassConstants.PASS_IS_EVENT_FIELD]) ? PassConstants.PASS_EVENT : PassConstants.PASS_BATTLE;
	});

	// Update the Featured Shop Bundle Listing
	$w("#shopDataset").onReady(() => {
		let shopBundle = $w("#shopDataset").getCurrentItem();
		$w("#shopImage").fitMode = "fit";
		$w("#shopCreditCost").text = "Credits: " + shopBundle[ShopConstants.SHOP_COST_CREDITS_FIELD];
	})
});