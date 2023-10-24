// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

import wixData from 'wix-data';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';

import * as GeneralFunctions from 'public/General.js';

let eightDayChallenges = ["Hello World"]; // A list of Challenge names that lasted for 8 days instead of 7 (currently just the S1 Week 1 Challenge).

$w.onReady(function () {
	$w("#noItemsAvailableText").hide();
	$w("#itemRepeater").data = [];

	$w("#dynamicDatasetItem").onReady(async () => {
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem();

		console.log("Current item", currentItem);

		let lastAvailableDatetime;
		let ultimateChallenge = currentItem;

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
			endAvailableDatetime.setDate(lastAvailableDatetime.getDate() + 
				((eightDayChallenges.includes(ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]) ? 8 : 7)));

			let lastAvailableString = GeneralFunctions.getLongMonthDayYearFromDate(lastAvailableDatetime);
			let endAvailableString = GeneralFunctions.getLongMonthDayYearFromDate(endAvailableDatetime);
			$w("#ultimateChallengeLastAvailableDatetimeText").text = lastAvailableString + " - " + endAvailableString;
		}
		else {
			// We don't have a last available datetime. Hide the textbox.
			$w("#ultimateChallengeLastAvailableDatetimeText").hide();
		}

		let seasonNum = -1, weekNum = -1;

		if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD].length > 0) {
			seasonNum = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD][0]; // We want the most recent Season Num available.
		}

		if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD].length > 0) {
			weekNum = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD][0]; // We want the most recent Week Num available.
		}

		if (seasonNum > 1000) {
			let seasonOperation = seasonNum % 10;
			seasonNum = Math.floor(seasonNum / 1000);
			$w("#ultimateChallengeSeasonAndWeek").text = "Season " + seasonNum + "." + seasonOperation + ", Week " + weekNum;
		}
		else {
			$w("#ultimateChallengeSeasonAndWeek").text = "Season " + seasonNum + ", Week " + weekNum;
		}

		let currentlyAvailable = currentItem[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD];

		if (!currentlyAvailable || currentlyAvailable == "false") {
			$w("#vectorImage1").hide(); // Hide the green check.
			$w("#vectorImage2").show(); // Show the red X.
		}
		else
		{
			$w("#vectorImage1").show(); // Show the green check.
			$w("#vectorImage2").hide(); // Hide the red X.
		}

		let repeaterItemArray = []; // This array will contain all the items in our repeater.

		let fieldsToQuery = currentItem[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD];
		if (fieldsToQuery.length === 0) {
			$w("#itemRepeater").hide();
			$w("#noItemsAvailableText").show();
		}

		for (let i = 0; i < fieldsToQuery.length; ++i) {
			let categoryWithItems = fieldsToQuery[i];

			let queryResults = await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, currentItem._id, categoryWithItems);
			if (queryResults.items.length > 0) {
				currentItem[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
			}

			let categoryIsCore = null; // If we're working with a core.
			let categoryIsConsumable = null; // If we're working with a consumable.
			let customizationCategory = null; // The customization category pertaining to the item we're working with.

			if (categoryWithItems in CustomizationConstants.PASS_RANK_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT) {
				categoryIsCore = false; // Not a core field.
				customizationCategory = CustomizationConstants.PASS_RANK_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[categoryWithItems];
				categoryIsConsumable = (customizationCategory == ConsumablesConstants.CONSUMABLES_KEY);
			}
			else if (categoryWithItems in CustomizationConstants.PASS_RANK_ITEM_FIELD_CORE_CATEGORY_DICT) {
				categoryIsCore = true; // Is a core field.
				customizationCategory = CustomizationConstants.PASS_RANK_ITEM_FIELD_CORE_CATEGORY_DICT[categoryWithItems];
				categoryIsConsumable = false;
			}
			else {
				console.error("The " + categoryWithItems + " reference field provided doesn't match any recognized values for the Pass Rank DB.");
				return;
			}

			const CATEGORY_KEYWORD = (categoryIsCore) ? "Core" : ((categoryIsConsumable) ? "Consumables" : "Customization");
			// Core CATEGORY_SPECIFIC_VARS dicts use Core instead of Customization for their config keys.
			// Consumables uses Consumables instead of Customization.

			const CATEGORY_SPECIFIC_VARS = (categoryIsCore) ? CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory] :
				((categoryIsConsumable) ? ConsumablesConstants.CONSUMABLES_CATEGORY_SPECIFIC_VARS[customizationCategory] :
				CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory]);

			let itemDb = CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "Db"]; // The DB containing the item.

			//let fullRankDetails = fullRankResults.items[0]; 
			let childItemArray = currentItem[categoryWithItems];

			for (let j = 0; j < childItemArray.length; ++j) {
				// Add these three fields to access after they have been added to the repeater.
				childItemArray[j].itemDb = itemDb;
				childItemArray[j].categoryKeyword = CATEGORY_KEYWORD;
				childItemArray[j].categorySpecificVars = CATEGORY_SPECIFIC_VARS;
				childItemArray[j].customizationCategory = customizationCategory;
				childItemArray[j].categoryIsCore = categoryIsCore;
				childItemArray[j].categoryIsConsumable = categoryIsConsumable;
			}

			repeaterItemArray = repeaterItemArray.concat(childItemArray);
		}

		// All items have been collected in a single array. Add them to the repeater and then process the items individually.
		$w("#itemRepeater").data = repeaterItemArray;

		$w("#itemRepeater").forEachItem(async ($item, itemData) => {
			$item("#effectVideoPlayer").collapse();
			$item("#effectVideoPlayer").hide();

			const CATEGORY_SPECIFIC_VARS = itemData.categorySpecificVars;
			const CATEGORY_KEYWORD = itemData.categoryKeyword;
			const ITEM_DB = itemData.itemDb;
			const CUSTOMIZATION_CATEGORY = itemData.customizationCategory;
			const CATEGORY_IS_CORE = itemData.categoryIsCore;
			//const CATEGORY_IS_CONSUMABLE = itemData.categoryIsConsumable; // We don't support consumables in Capstone Challenges at this time, and likely won't need to.

			$item("#itemButton").link = itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "UrlField"]];
			$item("#itemImage").src = itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "ImageField"]];
			$item("#itemName").text = itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]];

			if ("CustomizationEffectVideoField" in CATEGORY_SPECIFIC_VARS && 
				itemData[CATEGORY_SPECIFIC_VARS["CustomizationEffectVideoField"]]) {

				$item("#effectVideoPlayer").src = itemData[CATEGORY_SPECIFIC_VARS["CustomizationEffectVideoField"]];

				console.log("Showing video and hiding image.")
				$item("#itemImage").collapse();
				$item("#itemImage").hide();
				$item("#effectVideoPlayer").expand();
				$item("#effectVideoPlayer").show();
			}

			let sourceString = ""; // The string we'll be using for the SourceText box.
			if (!CATEGORY_IS_CORE && CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(CUSTOMIZATION_CATEGORY)) {
				// If we're dealing with a normal customization item or consumable(s).
				await wixData.queryReferenced(ITEM_DB, itemData._id, CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "SourceTypeField"])
					.then((results) => {
						results.items.forEach((element, index) => {
							if (index == 3) {
								sourceString += "etc., "; // We're truncating this since it's a lot to write for some consumables.
								return;
							}
							else if (index > 3) { // Don't process any more sources. No more room.
								return;
							}

							sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ", ";
						});

						// Remove the final comma.
						sourceString = sourceString.substr(0, sourceString.length - 2);
					})
					.catch((error) => {
						console.error("Error occurred while querying " + ITEM_DB + ": " + error);
					});
			} else { // Cores don't have the sourceTypeReference field for now. Let's just use what we know.
				sourceString = CapstoneChallengeConstants.CAPSTONE_CHALLENGE_SOURCE_TEXT;
			}
			$item("#itemSourceText").text = sourceString;

			let customizationTypeString = ""; // The string we'll be using for the CustomizationTypeText box.
			if (!CATEGORY_IS_CORE && CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(CUSTOMIZATION_CATEGORY)) {
				/*if (CATEGORY_IS_CONSUMABLE) {
					customizationTypeString = "Amount: ";
					// The Consumable name already tells its type, so we can use this for the number of Consumables offered at each tier (just 1 for now, but could be more later).
					if (itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME) {
						customizationTypeString += currentItem[PassConstants.PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD];
					}
					else if (itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME) {
						customizationTypeString += currentItem[PassConstants.PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD];
					}
					else if (itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_XP_GRANT_NAME) {
						customizationTypeString += currentItem[PassConstants.PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD];
					}
					else if (itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_CREDITS_NAME) {
						customizationTypeString += currentItem[PassConstants.PASS_RANK_NUMBER_OF_CREDITS_FIELD];
					}
				}
				else {*/
				// In general, we can just use the customization type referenced by the childItem.
				let customizationTypeResults = await wixData.query(CATEGORY_SPECIFIC_VARS["SocketDb"])
					.eq("_id", itemData[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "SocketReferenceField"]])
					.find();

				customizationTypeString = customizationTypeResults.items[0][CATEGORY_SPECIFIC_VARS["SocketNameField"]];
				//}
			}
			else { // If we're working with a core
				customizationTypeString = CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "Type"];
			}

			$item("#itemCustomizationType").text = customizationTypeString;

			$item("#itemImage").fitMode = "fit";
		});
	});
});
