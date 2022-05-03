import wixData from 'wix-data';
import * as ItemListSetupFunctions from 'public/ItemListSetup.js';
import * as GeneralFunctions from 'public/General.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';

/*// Capstone challenges only have these items as possible rewards.
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
}*/

$w.onReady(function () {
	// Set up the name filter.
	ItemListSetupFunctions.initialItemListSetup(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY);

	// Populate the data for each Capstone Challenge.
	$w("#listRepeater").onItemReady(async ($item, itemData) => {
		let ultimateChallenge = itemData;
		$item("#ultimateChallengeDescription").text = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] + " - " +
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
				const SOCKET_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].SocketDb;
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

			$item("#ultimateChallengeButton").link = childItem[CUSTOMIZATION_URL_FIELD];
			$item("#ultimateChallengeImage").src = childItem[CUSTOMIZATION_IMAGE_FIELD];
			$item("#ultimateChallengeImage").fitMode = "fit";
			$item("#ultimateChallengeRewardText").text = childItem[CUSTOMIZATION_NAME_FIELD] + " " + childItemCustomizationType;

			let lastAvailableDatetime;

			if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD].length > 1 &&
				ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD]) {
				// The challenge is available this week and was available in a previous week.
				lastAvailableDatetime = new Date(ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD][1]);
				// We know it's available this week, so we're interested in its last availability.
			}
			else if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD]) {
				// The challenge is available for the first time this week. Hide the textbox by making the datetime null.
				lastAvailableDatetime = null;
			}
			else {
				// The challenge was available in a previous week.
				lastAvailableDatetime = new Date(ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD][0]);
			}

			if (lastAvailableDatetime) {
				let endAvailableDatetime = new Date(lastAvailableDatetime);
				endAvailableDatetime.setDate(lastAvailableDatetime.getDate() + 7);

				let lastAvailableString = GeneralFunctions.getLongMonthDayYearFromDate(lastAvailableDatetime);
				let endAvailableString = GeneralFunctions.getLongMonthDayYearFromDate(endAvailableDatetime);
				$item("#ultimateChallengeLastAvailableDatetimeText").text = "Last Available: " + lastAvailableString + " - " + endAvailableString;
			}
			else {
				// We don't have a last available datetime. Hide the textbox.
				$item("#ultimateChallengeLastAvailableDatetimeText").hide();
			}

			let seasonNum = -1, weekNum = -1;

			if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD].length > 0) {
				seasonNum = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD][0]; // We want the most recent Season Num available.
			}

			if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD].length > 0) {
				weekNum = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD][0]; // We want the most recent Week Num available.
			}

			$item("#ultimateChallengeSeasonAndWeek").text = "Season " + seasonNum + ", Week " + weekNum;
		}
		else {
			console.error("No rewards found for this capstone challenge: " + ultimateChallenge);
		}
	});
});