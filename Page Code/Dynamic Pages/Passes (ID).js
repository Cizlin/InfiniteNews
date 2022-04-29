// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

import wixData from 'wix-data';
import * as KeyConstants from 'public/KeyConstants.js';
import {session} from 'wix-storage';
import {paginationKey} from 'public/Pagination.js';
import {getLongMonthDayYearFromDate} from 'public/General.js';

// These are all the fields that could possibly hold items for each rank and their URL fields.
const CHILD_ITEM_FIELD_NAMES_TO_URL_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: "link-armor-customizations-itemName", 
	[KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD]: "link-armor-customization-attachments-itemName", 
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: "link-items-title",
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: "link-vehicle-customizations-title",
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: "link-body-ai-customizations-itemName-2",
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: "link-presentation-customizations-title",
	[KeyConstants.SHOP_CONSUMABLE_REFERENCE_FIELD]: "link-consumables-itemName",
	[KeyConstants.PASS_ARMOR_CORE_REFERENCE_FIELD]: "link-armor-cores-name",
	[KeyConstants.PASS_WEAPON_CORE_REFERENCE_FIELD]: "link-weapon-cores-name",
	[KeyConstants.PASS_VEHICLE_CORE_REFERENCE_FIELD]: "link-vehicle-cores-name"
};

// The values here are the name fields for the DBs.
const CHILD_ITEM_FIELD_NAMES_TO_NAME_FIELD_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: "itemName", 
	[KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD]: "itemName", 
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: "itemName",
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: "itemName",
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: "itemName",
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: "itemName",
	[KeyConstants.SHOP_CONSUMABLE_REFERENCE_FIELD]: "itemName",
	[KeyConstants.PASS_ARMOR_CORE_REFERENCE_FIELD]: "name",
	[KeyConstants.PASS_WEAPON_CORE_REFERENCE_FIELD]: "name",
	[KeyConstants.PASS_VEHICLE_CORE_REFERENCE_FIELD]: "name"
};

const CHILD_ITEM_FIELD_NAMES_TO_DB_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: KeyConstants.ARMOR_CUSTOMIZATION_DB, 
	[KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD]: KeyConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_DB,
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: KeyConstants.WEAPON_CUSTOMIZATION_DB,
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: KeyConstants.VEHICLE_CUSTOMIZATION_DB,
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: KeyConstants.BODY_AND_AI_CUSTOMIZATION_DB,
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: KeyConstants.SPARTAN_ID_CUSTOMIZATION_DB,
	[KeyConstants.SHOP_CONSUMABLE_REFERENCE_FIELD]: KeyConstants.CONSUMABLES_DB,
	[KeyConstants.PASS_ARMOR_CORE_REFERENCE_FIELD]: KeyConstants.ARMOR_CORE_DB,
	[KeyConstants.PASS_WEAPON_CORE_REFERENCE_FIELD]: KeyConstants.WEAPON_CORE_DB,
	[KeyConstants.PASS_VEHICLE_CORE_REFERENCE_FIELD]: KeyConstants.VEHICLE_CORE_DB
}

const CHILD_ITEM_FIELD_NAMES_WITH_SOURCE_TYPES = [
	KeyConstants.SHOP_ARMOR_REFERENCE_FIELD,
	KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD,
	KeyConstants.SHOP_WEAPON_REFERENCE_FIELD,
	KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD,
	KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD,
	KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD,
	KeyConstants.SHOP_CONSUMABLE_REFERENCE_FIELD
];

const CHILD_ITEM_FIELD_NAMES_TO_SOCKET_DB_DICT = {
	[KeyConstants.SHOP_ARMOR_REFERENCE_FIELD]: KeyConstants.ARMOR_SOCKET_DB,
	[KeyConstants.SHOP_WEAPON_REFERENCE_FIELD]: KeyConstants.WEAPON_SOCKET_DB,
	[KeyConstants.SHOP_VEHICLE_REFERENCE_FIELD]: KeyConstants.VEHICLE_SOCKET_DB,
	[KeyConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: KeyConstants.BODY_AND_AI_SOCKET_DB,
	[KeyConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: KeyConstants.SPARTAN_ID_SOCKET_DB,
}

function loadRankPage(pageNumber) {
	$w("#freePassRanksDataset").loadPage(pageNumber);
	$w("#premiumPassRanksDataset").loadPage(pageNumber);
}

function setPassPaginationIndexFromSave() {
    let savedPage = session.getItem(paginationKey);
    if (parseInt(savedPage) > 0)
    {
        $w("#passItemPagination").currentPage = parseInt(savedPage);
        loadRankPage(parseInt(savedPage));
    }
    else
    {
        $w("#passItemPagination").currentPage = 1;
		loadRankPage(1);
    }
}

function convertDateObjectToMMDDYYYYString(date) {
	return ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' 
		+ ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' 
		+ date.getFullYear();
}

function showCorrectAvailability(currentlyAvailable) {
	if (currentlyAvailable) {
		$w("#unavailableImage").hide();
		$w("#availableImage").show();
	}
	else {
		$w("#availableImage").hide();
		$w("#unavailableImage").show();
	}
}

$w.onReady(function () {
	$w("#dynamicDataset").onReady(async () => {
		// Get the current Pass so we can start populating a bunch of the stuff on this page.
		let currentPass = $w("#dynamicDataset").getCurrentItem();

		// First, we should display the correct pass type, set the proper date explanation, and show the applicable availability.
		if (currentPass.isEvent) {
			$w("#passTypeText").text = "Event Pass";
			$w("#datesFeaturedExplanationText").text = "The Event Pass can only be progressed during these timeframes.";
			showCorrectAvailability(currentPass.currentlyAvailable);
			$w("#premiumItemContainer").hide(); // Event Passes are 100% free for now, so let's not confuse fans.
		}
		else {
			$w("#passTypeText").text = "Battle Pass";
			$w("#datesFeaturedExplanationText").text = "The Battle Pass can be progressed at any time during and after these timeframes.";
			showCorrectAvailability(true); // Battle Passes are always available after release.
		}

		// Next, we need to display the date intervals during which the pass is available/featured.
		for (let i = 0; i < currentPass.dateRangeArray.length; ++i) {
			let startDate = new Date(currentPass.dateRangeArray[i].startDate);
			let endDate = new Date(currentPass.dateRangeArray[i].endDate);

			let startDateString = getLongMonthDayYearFromDate(startDate); //convertDateObjectToMMDDYYYYString(startDate);
			let endDateString = getLongMonthDayYearFromDate(endDate); //convertDateObjectToMMDDYYYYString(endDate);

			if (i == 0) {
				$w("#datesAvailableText").text = startDateString + " - " + endDateString;
			}
			else {
				$w("#datesAvailableText").text += "\n" + startDateString + " - " + endDateString;
			}
		}

		// Finally, we'll display the pass contents through some manually created queries and pagination management.
		// Let's define how we want each rank to populate its visible entry.
		let repeaterTypeArray = ["free", "premium"];
		for (let i = 0; i < repeaterTypeArray.length; ++i) {
			let repeaterType = repeaterTypeArray[i]; // Either "free" or "premium";
			$w("#" + repeaterType + "ItemRepeater").onItemReady(async ($item, itemData) => {
				//console.log(itemData);
				// First, we need to figure out which child item category actually has items.
				let categoryWithItems = "";
				if (itemData.fieldsWithItems.length > 0) { // We're just going to grab the first category and item for now.
					categoryWithItems = itemData.fieldsWithItems[0];
					let queryResults = await wixData.queryReferenced(KeyConstants.PASS_RANK_DB, itemData._id, categoryWithItems);
					if (queryResults.items.length > 0) {
						itemData[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
					}
				}

				/*for (let fieldName in CHILD_ITEM_FIELD_NAMES_TO_URL_DICT) {
					let queryResults = await wixData.queryReferenced(KeyConstants.PASS_RANK_DB, itemData._id, fieldName);
					if (queryResults.items.length > 0) {
						categoryWithItems = fieldName;
						itemData[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
						break;
					}
				}*/

				if (categoryWithItems == "") { // Some ranks won't have any items in them, particularly some free ranks in Battle Passes.
					// We want to say something like "no rewards here" or something. 
					$item("#" + repeaterType + "ItemButton").hide(); // Hide the button so we can't click it.
					$item("#" + repeaterType + "ItemImage").hide(); // Hide the image since there's nothing to show.
					$item("#" + repeaterType + "ItemNameText").text = itemData.rankNum + ": No Items";
					$item("#" + repeaterType + "ItemSourceText").text = "";
					$item("#" + repeaterType + "ItemTypeText").text = "";
				}
				else {
					let itemDb = CHILD_ITEM_FIELD_NAMES_TO_DB_DICT[categoryWithItems]; // The DB containing the item.

					//let fullRankDetails = fullRankResults.items[0]; 
					let childItemArray = itemData[categoryWithItems];
					let childItem = childItemArray[0]; // We're assuming that we only have one item returned. We'll worry about multiple items later.

					$item("#" + repeaterType + "ItemButton").link = childItem[CHILD_ITEM_FIELD_NAMES_TO_URL_DICT[categoryWithItems]];
					$item("#" + repeaterType + "ItemImage").src = childItem.image;
					$item("#" + repeaterType + "ItemNameText").text = itemData.rankNum + ": " + childItem[CHILD_ITEM_FIELD_NAMES_TO_NAME_FIELD_DICT[categoryWithItems]];

					let sourceString = ""; // The string we'll be using for the SourceText box.
					if (CHILD_ITEM_FIELD_NAMES_WITH_SOURCE_TYPES.includes(categoryWithItems)) { // If we're dealing with a normal customization item.
						
						await wixData.queryReferenced(itemDb, childItem._id, "sourceTypeReference")
							.then((results) => {
								results.items.forEach((element, index) => {
									if (index == 3) {
										sourceString += "etc., "; // We're truncating this since it's a lot to write for some consumables.
										return;
									}
									else if (index > 3) { // Don't process any more sources. No more room.
										return;
									}

									sourceString += element.name + ", ";
								});

								// Remove the final comma.
								sourceString = sourceString.substr(0, sourceString.length - 2);
							})
							.catch((error) => {
								console.error("Error occurred while querying " + itemDb + ": " + error);
							});
					} else { // Cores don't have the sourceTypeReference field for now. Let's just use what we know.
						sourceString = (itemData.isEvent) ? "Event Pass" : ((repeaterType == "free") ? "Battle Pass - Free" : "Battle Pass - Paid");
					}
					$item("#" + repeaterType + "ItemSourceText").text = sourceString;

					let customizationTypeString = ""; // The string we'll be using for the CustomizationTypeText box.
					if (CHILD_ITEM_FIELD_NAMES_WITH_SOURCE_TYPES.includes(categoryWithItems)) {
						if (categoryWithItems == KeyConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD) {
							// Armor attachments really need to have their type added as a DB field in case more attachment types appear in the future. 
							// For now, let's just assume they're Helmet Attachments.
							customizationTypeString = "Helmet Attachment";
						}
						else if (categoryWithItems == KeyConstants.SHOP_CONSUMABLE_REFERENCE_FIELD) {
							customizationTypeString = "Amount: ";
							// The Consumable name already tells its type, so we can use this for the number of Consumables offered at each tier (just 1 for now, but could be more later).
							if (childItem.itemName == "Challenge Swap") {
								customizationTypeString += itemData.numberOfChallengeSwaps;
							}
							else if (childItem.itemName == "XP Boost") {
								customizationTypeString += itemData.numberOfXpBoosts;
							}
							else if (childItem.itemName == "XP Grant") {
								customizationTypeString += itemData.numberOfXpGrants;
							}
						}
						else {
							// In general, we can just use the customization type referenced by the childItem.
							let customizationTypeResults = await wixData.query(CHILD_ITEM_FIELD_NAMES_TO_SOCKET_DB_DICT[categoryWithItems])
								.eq("_id", childItem["customizationTypeReference"])
								.find();

							customizationTypeString = customizationTypeResults.items[0].name;
						}
					}
					else { // If we're working with a core
						if (categoryWithItems == KeyConstants.PASS_ARMOR_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Armor Core";
						}
						else if (categoryWithItems == KeyConstants.PASS_WEAPON_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Weapon Core";
						}
						else if (categoryWithItems == KeyConstants.PASS_VEHICLE_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Vehicle Core";
						}
					}

					$item("#" + repeaterType + "ItemTypeText").text = customizationTypeString;

					$item("#" + repeaterType + "ItemImage").fitMode = "fit";
				}
			});
		}

		$w("#passItemPagination").onChange((event) => {
			// Normally, we can just keep this part of the code in the masterPage.js file, but we really don't want to scroll and filtering by URL is a bit tedious.
			// So let's just rename the pagination and work on it separately.
            session.setItem(paginationKey, event.target.currentPage);
			loadRankPage(event.target.currentPage);
        });

		$w("#freePassRanksDataset").onReady(setPassPaginationIndexFromSave);
		$w("#premiumPassRanksDataset").onReady(setPassPaginationIndexFromSave);

		//$w("#freeItemRepeater").data = (await $w("#freePassRanksDataset").getItems(0, 10)).items;
			

	});
});