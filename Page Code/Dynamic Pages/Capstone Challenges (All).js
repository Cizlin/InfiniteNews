import * as KeyConstants from 'public/KeyConstants.js';
import wixData from 'wix-data';
import {initialItemListSetup} from 'public/ItemListSetup.js';
import {getLongMonthDayYearFromDate} from 'public/General.js';

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

$w.onReady(function () {
	// Set up the name filter.
	initialItemListSetup(KeyConstants.CAPSTONE_CHALLENGE_SECTION);

	// Populate the data for each Capstone Challenge.
	$w("#listRepeater").onItemReady(async ($item, itemData) => {
		let ultimateChallenge = itemData;
		$item("#ultimateChallengeDescription").text = ultimateChallenge.description + " - " + ultimateChallenge.completionThreshold;

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

		/*// Now that we have our current Ultimate Challenge, we need to grab the reward by iterating over all six possible child item categories.
		let categoryWithItems = "";
		for (let fieldName in CHILD_ITEM_FIELD_NAMES_TO_URL_DICT) {
			let queryResults = await wixData.queryReferenced(KeyConstants.CAPSTONE_CHALLENGE_DB, ultimateChallenge._id, fieldName);
			if (queryResults.items.length > 0) {
				categoryWithItems = fieldName;
				ultimateChallenge[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
				break;
			}
		}*/

		if (ultimateChallenge[categoryWithItems].length > 0) {
			let childItem = ultimateChallenge[categoryWithItems][0];

			let childItemCustomizationType = "Helmet Attachment"; // This is for the Armor Attachment category only.
			if (KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD != categoryWithItems) { // We need to retrieve the customization type.
				let customizationTypeResults = await wixData.query(CHILD_ITEM_FIELD_NAMES_TO_SOCKET_DB_DICT[categoryWithItems])
					.eq("_id", childItem["customizationTypeReference"])
					.find();

				childItemCustomizationType = customizationTypeResults.items[0].name;
			}

			$item("#ultimateChallengeButton").link = childItem[CHILD_ITEM_FIELD_NAMES_TO_URL_DICT[categoryWithItems]];
			$item("#ultimateChallengeImage").src = childItem.image;
			$item("#ultimateChallengeImage").fitMode = "fit";
			$item("#ultimateChallengeRewardText").text = childItem.itemName + " " + childItemCustomizationType;

			let lastAvailableDatetime;

			if (ultimateChallenge.availableDateArray.length > 1 && ultimateChallenge.currentlyAvailable) {
				// The challenge is available this week and was available in a previous week.
				lastAvailableDatetime = new Date(ultimateChallenge.availableDateArray[1]); // We know it's available this week, so we're interested in its last availability.
			}
			else if (ultimateChallenge.currentlyAvailable) {
				// The challenge is available for the first time this week. Hide the textbox by making the datetime null.
				lastAvailableDatetime = null;
			}
			else {
				// The challenge was available in a previous week.
				lastAvailableDatetime = new Date(ultimateChallenge.availableDateArray[0]);
			}

			if (lastAvailableDatetime) {
				/*var monthString = (lastAvailableDatetime.getMonth() + 1).toString();
				while (monthString.length < 2) {
					monthString = "0" + monthString;
				}

				var dateString = lastAvailableDatetime.getDate().toString();
				while (dateString.length < 2) {
					dateString = "0" + dateString;
				}

				var yearString = lastAvailableDatetime.getFullYear().toString();

				let lastAvailableString = monthString + "/" + dateString + "/" + yearString;
				*/
				let endAvailableDatetime = new Date(lastAvailableDatetime);
				endAvailableDatetime.setDate(lastAvailableDatetime.getDate() + 7);

				let lastAvailableString = getLongMonthDayYearFromDate(lastAvailableDatetime);
				let endAvailableString = getLongMonthDayYearFromDate(endAvailableDatetime);
				$item("#ultimateChallengeLastAvailableDatetimeText").text = "Last Available: " + lastAvailableString + " - " + endAvailableString;
			}
			else {
				// We don't have a last available datetime. Hide the textbox.
				$item("#ultimateChallengeLastAvailableDatetimeText").hide();
			}

			let seasonNum = -1, weekNum = -1;

			if (ultimateChallenge.availableSeasonArray.length > 0) {
				seasonNum = ultimateChallenge.availableSeasonArray[0]; // We want the most recent Season Num available.
			}

			if (ultimateChallenge.availableWeekArray.length > 0) {
				weekNum = ultimateChallenge.availableWeekArray[0]; // We want the most recent Week Num available.
			}

			$item("#ultimateChallengeSeasonAndWeek").text = "Season " + seasonNum + ", Week " + weekNum;
		}
		else {
			console.error("No rewards found for this capstone challenge: " + ultimateChallenge);
		}
	});
});