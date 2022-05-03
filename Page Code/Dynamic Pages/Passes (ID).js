import wixData from 'wix-data';
import { session } from 'wix-storage';

import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

import { paginationKey } from 'public/Pagination.js';
import * as GeneralFunctions from 'public/General.js';

// These are all the fields that could possibly hold items for each rank and their URL fields.
/*const CHILD_ITEM_FIELD_NAMES_TO_URL_DICT = {
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
}*/

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

/*function convertDateObjectToMMDDYYYYString(date) {
	return ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' 
		+ ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' 
		+ date.getFullYear();
}*/

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
		if (currentPass[PassConstants.PASS_IS_EVENT_FIELD]) {
			$w("#passTypeText").text = PassConstants.PASS_EVENT;
			$w("#datesFeaturedExplanationText").text = "The Event Pass can only be progressed during these timeframes.";
			showCorrectAvailability(currentPass[PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD]);
			$w("#premiumItemContainer").hide(); // Event Passes are 100% free for now, so let's not confuse fans.
		}
		else {
			$w("#passTypeText").text = PassConstants.PASS_BATTLE;
			$w("#datesFeaturedExplanationText").text = "The Battle Pass can be progressed at any time during and after these timeframes.";
			showCorrectAvailability(true); // Battle Passes are always available after release.
		}

		// Next, we need to display the date intervals during which the pass is available/featured.
		for (let i = 0; i < currentPass[PassConstants.PASS_DATE_RANGE_ARRAY_FIELD].length; ++i) {
			let startDate = new Date(currentPass[PassConstants.PASS_DATE_RANGE_ARRAY_FIELD][i][PassConstants.PASS_DATE_RANGE_ARRAY_START_DATE_FIELD]);
			let endDate = new Date(currentPass[PassConstants.PASS_DATE_RANGE_ARRAY_FIELD][i][PassConstants.PASS_DATE_RANGE_ARRAY_END_DATE_FIELD]);

			let startDateString = GeneralFunctions.getLongMonthDayYearFromDate(startDate); //convertDateObjectToMMDDYYYYString(startDate);
			let endDateString = GeneralFunctions.getLongMonthDayYearFromDate(endDate); //convertDateObjectToMMDDYYYYString(endDate);

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
				if (itemData[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].length > 0) { // We're just going to grab the first category and item for now.
					categoryWithItems = itemData[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD][0];
					let queryResults = await wixData.queryReferenced(PassConstants.PASS_RANK_DB, itemData._id, categoryWithItems);
					if (queryResults.items.length > 0) {
						itemData[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
					}
				}

				if (categoryWithItems == "") { // Some ranks won't have any items in them, particularly some free ranks in Battle Passes.
					// We want to say something like "no rewards here" or something. 
					$item("#" + repeaterType + "ItemButton").hide(); // Hide the button so we can't click it.
					$item("#" + repeaterType + "ItemImage").hide(); // Hide the image since there's nothing to show.
					$item("#" + repeaterType + "ItemNameText").text = itemData.rankNum + ": No Items";
					$item("#" + repeaterType + "ItemSourceText").text = "";
					$item("#" + repeaterType + "ItemTypeText").text = "";
				}
				else {
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
					let childItemArray = itemData[categoryWithItems];
					let childItem = childItemArray[0]; // We're assuming that we only have one item returned. We'll worry about multiple items later.

					$item("#" + repeaterType + "ItemButton").link = childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "UrlField"]];
					$item("#" + repeaterType + "ItemImage").src = childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "ImageField"]];
					$item("#" + repeaterType + "ItemNameText").text = itemData[PassConstants.PASS_RANK_RANK_NUM_FIELD] + ": " +
						childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]];

					let sourceString = ""; // The string we'll be using for the SourceText box.
					if (!categoryIsCore && CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(customizationCategory)) {
						// If we're dealing with a normal customization item or consumable(s).
						await wixData.queryReferenced(itemDb, childItem._id, CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "SourceTypeField"])
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
								console.error("Error occurred while querying " + itemDb + ": " + error);
							});
					} else { // Cores don't have the sourceTypeReference field for now. Let's just use what we know.
						sourceString = (itemData[PassConstants.PASS_IS_EVENT_FIELD]) ? CustomizationConstants.SOURCE_TYPE_EVENT_PASS :
							((repeaterType == "free") ? CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_FREE : CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_PAID);
					}
					$item("#" + repeaterType + "ItemSourceText").text = sourceString;

					let customizationTypeString = ""; // The string we'll be using for the CustomizationTypeText box.
					if (!categoryIsCore && CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(customizationCategory)) {
						if (CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
							// Armor attachments really need to have their type added as a DB field in case more attachment types appear in the future. 
							// For now, let's just assume they're Helmet Attachments.
							customizationTypeString = "Helmet Attachment"; // TODO: Improve this.
						}
						else if (categoryIsConsumable) {
							customizationTypeString = "Amount: ";
							// The Consumable name already tells its type, so we can use this for the number of Consumables offered at each tier (just 1 for now, but could be more later).
							if (childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME) {
								customizationTypeString += itemData[PassConstants.PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD];
							}
							else if (childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME) {
								customizationTypeString += itemData[PassConstants.PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD];
							}
							else if (childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_XP_GRANT_NAME) {
								customizationTypeString += itemData[PassConstants.PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD];
							}
							else if (childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "NameField"]] == ConsumablesConstants.CONSUMABLES_CREDITS_NAME) {
								customizationTypeString += itemData[PassConstants.PASS_RANK_NUMBER_OF_CREDITS_FIELD];
                            }
						}
						else {
							// In general, we can just use the customization type referenced by the childItem.
							let customizationTypeResults = await wixData.query(CATEGORY_SPECIFIC_VARS["SocketDb"])
								.eq("_id", childItem[CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "SocketReferenceField"]])
								.find();

							customizationTypeString = customizationTypeResults.items[0][CATEGORY_SPECIFIC_VARS["SocketNameField"]];
						}
					}
					else { // If we're working with a core
						customizationTypeString = CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "Type"];
						/*if (categoryWithItems == KeyConstants.PASS_ARMOR_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Armor Core";
						}
						else if (categoryWithItems == KeyConstants.PASS_WEAPON_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Weapon Core";
						}
						else if (categoryWithItems == KeyConstants.PASS_VEHICLE_CORE_REFERENCE_FIELD) {
							customizationTypeString = "Vehicle Core";
						}*/
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
	});
});