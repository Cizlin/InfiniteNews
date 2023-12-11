// .jsw files enable you to write functions that run on the server side
// Test any backend function by clicking the "Play" button on the left side of the code panel
// About testing backend functions: https://support.wix.com/en/article/velo-testing-your-backend-functions

// Import Wix functions and tools.
import wixFetch from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import wixData from 'wix-data';

// Import 3rd party packages.
import structuredClone from '@ungap/structured-clone';

// Import constants.
import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as ApiConstants from 'public/Constants/ApiConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as GeneralConstants from 'public/Constants/GeneralConstants.js';

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

// Import helper functions.
import * as GeneralBackendFunctions from 'backend/GeneralBackendFunctions.jsw';
import * as ShopFunctions from 'backend/ShopAutomationFunctions.jsw';
import * as DiscordFunctions from 'backend/DiscordBotFunctions.jsw';
import * as TwitterFunctions from 'backend/TwitterApiFunctions.jsw';
import * as GeneralFunctions from 'public/General.js';
import * as ApiFunctions from 'backend/ApiFunctions.jsw';
import * as MediaManagerFunctions from 'backend/MediaManagerFunctions.jsw';

// We have a few tasks here. For one, we need to add all the Ranks to the PassRanks DB. While we do that, we need to update the sourcetype and source for each item within the ranks.

export async function getNumCores(categoryKey) {
	const CORE_DB = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[categoryKey].CoreDb;
	const CORE_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[categoryKey].CoreCurrentlyAvailableField;

	return await wixData.query(CORE_DB)
		.eq(CORE_CURRENTLY_AVAILABLE_FIELD, true)
		.find()
		.then((results) => {
			return results.items.length;
		})
		.catch((error) => {
			console.error(error + " occurred while counting the number of cores for " + categoryKey + "; returning backup default");

			const NUM_CORES_DEFAULT = {
				[ArmorConstants.ARMOR_KEY]: 8,
				[WeaponConstants.WEAPON_KEY]: 9,
				[VehicleConstants.VEHICLE_KEY]: 7
			};

			return NUM_CORES_DEFAULT[categoryKey];
		});
}

async function getItemData(headers, path) {
	let itemJson = await ApiFunctions.getCustomizationItem(headers, path);
	if (!itemJson.CommonData.Title) {
		console.error("Can't find name of item whose path is " + path + " and whose json is ", itemJson);
	}

	let isKit = false;
	let waypointId = itemJson.CommonData.Id;

	if ("IsKit" in itemJson) {
		isKit = itemJson.IsKit;
		if (!isKit) {
			let coreJson = await ApiFunctions.getCustomizationItem(headers, itemJson.CommonData.ParentPaths[0].Path); // Assumes there is only one core for this theme.
			waypointId = coreJson.CommonData.Id;
		}
	}

	return {
		itemName: itemJson.CommonData.Title,
		itemId: waypointId,
		isKit: isKit
	};
}


export async function getPassList(passPath, headers = null) {
	if (!headers) {
		headers = await ApiFunctions.makeWaypointHeaders();
	}
	let passJson = await ApiFunctions.getCustomizationItem(headers, passPath);
	let rankArray = [];
	/* Items in the rank array will be of the form {
		rank: [rank],
		freeItems: [itemDataArray],
		freeCurrencies: [currencyDataArray],
		premiumItems: [itemDataArray],
		premiumCurrencies: [currencyDataArray]
	}
	*/
	//let nicePrintArray = ""; // The lines will be separated by \n characters.

	for (let i = 0; i < passJson.Ranks.length; ++i) {
		let rankWaypointJson = passJson.Ranks[i];
		let rankItemJson = { rank: passJson.Ranks[i].Rank };

		//let nicePrintLine = passJson.Ranks[i].Rank + ": ";

		let freeItemDataArray = [];
		let freeCurrencyDataArray = [];

		for (let j = 0; j < rankWaypointJson.FreeRewards.InventoryRewards.length; ++j) {
			let inventoryItemJson = rankWaypointJson.FreeRewards.InventoryRewards[j];
			let itemData = await getItemData(headers, inventoryItemJson.InventoryItemPath);
			let itemType = inventoryItemJson.Type;
			if (inventoryItemJson.Type.includes("Theme") && !itemData.isKit) { // Armor Cores can be earned through passes, so we need to address this case and differentiate them from Kits.
				itemType = inventoryItemJson.Type.replace("Theme", "Core");
			}
			freeItemDataArray.push({
				itemName: itemData.itemName,
				itemType: itemType,
				itemId: itemData.itemId
			});

			//nicePrintLine += itemData.itemName + " " + WAYPOINT_TO_SITE_CUSTOMIZATION_TYPES[inventoryItemJson.Type] + ", ";
		}

		for (let j = 0; j < rankWaypointJson.FreeRewards.CurrencyRewards.length; ++j) {
			let inventoryItemJson = rankWaypointJson.FreeRewards.CurrencyRewards[j];
			let itemName = "";

			if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_GRANT_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_XP_GRANT_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_BOOST_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CREDITS_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_CREDITS_NAME;
			}
			else {
				console.error("Matching Consumable name not found for " + inventoryItemJson.CurrencyPath);
			}

			freeCurrencyDataArray.push({
				consumableName: itemName,
				consumableAmount: inventoryItemJson.Amount
			});

			//nicePrintLine += inventoryItemJson.Amount + "x " + itemName + ", ";
		}

		let premiumItemDataArray = [];
		let premiumCurrencyDataArray = [];

		for (let j = 0; j < rankWaypointJson.PaidRewards.InventoryRewards.length; ++j) {
			let inventoryItemJson = rankWaypointJson.PaidRewards.InventoryRewards[j];
			let itemData = await getItemData(headers, inventoryItemJson.InventoryItemPath);
			let itemType = inventoryItemJson.Type;
			if (inventoryItemJson.Type.includes("Theme") && !itemData.isKit) { // Armor Cores can be earned through passes, so we need to address this case and differentiate them from Kits.
				itemType = inventoryItemJson.Type.replace("Theme", "Core");
			}
			premiumItemDataArray.push({
				itemName: itemData.itemName,
				itemType: itemType,
				itemId: itemData.itemId
			});

			//nicePrintLine += itemData.itemName + " " + WAYPOINT_TO_SITE_CUSTOMIZATION_TYPES[inventoryItemJson.Type] + ", ";
		}

		for (let j = 0; j < rankWaypointJson.PaidRewards.CurrencyRewards.length; ++j) {
			let inventoryItemJson = rankWaypointJson.PaidRewards.CurrencyRewards[j];
			let itemName = "";

			if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_GRANT_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_XP_GRANT_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_BOOST_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME;
			}
			else if (inventoryItemJson.CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CREDITS_PATH_CONTENTS)) {
				itemName = ConsumablesConstants.CONSUMABLES_CREDITS_NAME;
			}
			else {
				console.error("Matching Consumable name not found for " + inventoryItemJson.CurrencyPath);
			}

			premiumCurrencyDataArray.push({
				consumableName: itemName,
				consumableAmount: inventoryItemJson.Amount
			});

			//nicePrintLine += inventoryItemJson.Amount + "x " + itemName + ", ";
		}

		rankItemJson.freeItems = freeItemDataArray;
		rankItemJson.freeCurrencies = freeCurrencyDataArray;
		rankItemJson.premiumItems = premiumItemDataArray;
		rankItemJson.premiumCurrencies = premiumCurrencyDataArray;

		rankArray.push(rankItemJson);
		//nicePrintArray += nicePrintLine + "\n";
	}

	//console.log("Pretty print for " + passJson.Name);
	//console.log(nicePrintArray);

	return rankArray;
}

// This function either inserts a new pass into the Passes DB or updates the existing pass. The pass is found in the DB by its waypointId.
export async function updatePassInDb(passDbJson, folderDict, headers) {
	let results = await wixData.query(PassConstants.PASS_DB)
		.eq(PassConstants.PASS_WAYPOINT_ID_FIELD, passDbJson.waypointId)
		.find();

	let passETagChanged = true; // Assume we are processing stuff by default.

	if (results.items.length > 0) {
		// Get the existing _id and image ETag.
		passDbJson._id = results.items[0]._id;
		passDbJson[PassConstants.PASS_IMAGE_ETAG_FIELD] = results.items[0][PassConstants.PASS_IMAGE_ETAG_FIELD];
		passETagChanged = (passDbJson[PassConstants.PASS_ETAG_FIELD] != results.items[0][PassConstants.PASS_ETAG_FIELD]); // Check the equivalence of the ETags.
	}

	let imageResults = await MediaManagerFunctions.getCustomizationImageUrl(
		folderDict,
		headers,
		passDbJson[PassConstants.PASS_TITLE_FIELD],
		passDbJson[PassConstants.PASS_IMAGE_FIELD],
		'image/png',
		PassConstants.PASS_KEY,
		(passDbJson[PassConstants.PASS_IS_EVENT_FIELD]) ? PassConstants.PASS_EVENT : PassConstants.PASS_BATTLE,
		null,
		null,
		null,
		passDbJson[PassConstants.PASS_IMAGE_ETAG_FIELD],
		true); // We want to validate and return the ETag.

	passDbJson[PassConstants.PASS_IMAGE_FIELD] = imageResults[0];
	passDbJson[PassConstants.PASS_IMAGE_ETAG_FIELD] = imageResults[1];

	let saveResults = await wixData.save(PassConstants.PASS_DB, passDbJson);

	saveResults.passETagChanged = passETagChanged; // Add this to the saved item so we can determine whether processing is even necessary.

	return saveResults;

}

function seasonAtOrAfter5(seasonNumber) {
	if (seasonNumber > 1000) {
		return seasonNumber >= 5000; // If this is an operation during or after Season 5.
	}
	else {
		return seasonNumber >= 5; // If this is a main season during or after Season 5.
	}
}

// This function adds or updates each rank in the DB
export async function processRank(
	rank,
	passDbId,
	consumableNameToIdDict,
	currentlyAvailable,
	seasonNumber,
	isEvent,
	passName,
	isPremium,
	typeDict) { // Type Dict will be generated by the GeneralBackendFunctions.generateTypeDict(true) function.

	if (isPremium && rank.premiumCurrencies.length <= 0 && rank.premiumItems.length <= 0) {
		// We don't need to process premium ranks if they don't exist (we do need to add empty free rewards due to the current Battle Pass structure though).
		return;
	}

	let rankDbJson = {
		[PassConstants.PASS_RANK_IS_PREMIUM_FIELD]: isPremium,
		[PassConstants.PASS_RANK_RANK_FIELD]: rank.rank.toString(),
		[PassConstants.PASS_RANK_RANK_NUM_FIELD]: rank.rank,
		[PassConstants.PASS_RANK_PARENT_PASS_FIELD]: passDbId,
		[PassConstants.PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD]: 0, // These are the default quantities, but this might be different later.
		[PassConstants.PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD]: 0,
		[PassConstants.PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD]: 0,
		[PassConstants.PASS_RANK_NUMBER_OF_CREDITS_FIELD]: 0,
		[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD]: []
		// This last field will contain the field IDs of all the different items we're adding. We'll have to update the rank in the DB twice unfortunately.
	}

	const maxRetries = 10;
	let overallRetry = true;
	let overallRetryCount = 0;

	while (overallRetry && overallRetryCount < maxRetries) {
		try {
			//#region Process the consumable rewards.
			// First, we should process the Consumables and count how many of each we have.
			const CONSUMABLES_REFERENCE_FIELD = PassConstants.PASS_RANK_CONSUMABLE_REFERENCE_FIELD;

			for (const KEY in CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_REFERENCE_FIELD_DICT) {
				const FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_REFERENCE_FIELD_DICT[KEY];
				rankDbJson[FIELD] = []; // Initialize each customization item list with an empty array.
			}

			for (const KEY in CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT) {
				const FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT[KEY];
				rankDbJson[FIELD] = []; // Initialize each customization item list with an empty array.
			}

			// Reset the consumable counts.
			rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD] = 0;
			rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD] = 0;
			rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD] = 0;
			rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_CREDITS_FIELD] = 0;

			let currencyArray = ((isPremium) ? rank.premiumCurrencies : rank.freeCurrencies);

			for (let i = 0; i < currencyArray.length; ++i) {
				let consumableName = currencyArray[i].consumableName;
				let consumableAmount = currencyArray[i].consumableAmount;
				let consumableSiteId = consumableNameToIdDict[consumableName]; // The consumable's database ID

				let validConsumable = false; // If this becomes true, the consumable is of a valid type.

				if (consumableName == ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME) {
					rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD] += consumableAmount;
					validConsumable = true;
				}
				else if (consumableName == ConsumablesConstants.CONSUMABLES_XP_GRANT_NAME) {
					rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD] += consumableAmount;
					validConsumable = true;
				}
				else if (consumableName == ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME) {
					rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD] += consumableAmount;
					validConsumable = true;
				}
				else if (consumableName == ConsumablesConstants.CONSUMABLES_CREDITS_NAME) {
					rankDbJson[PassConstants.PASS_RANK_NUMBER_OF_CREDITS_FIELD] += consumableAmount;
					validConsumable = true;
				}

				if (validConsumable && !rankDbJson[CONSUMABLES_REFERENCE_FIELD].includes(consumableSiteId)) {
					// We don't want duplicate IDs. We probably won't have that, but doesn't hurt to check.
					rankDbJson[CONSUMABLES_REFERENCE_FIELD].push(consumableSiteId);

					if (!rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].includes(CONSUMABLES_REFERENCE_FIELD)) { // Note that we have consumables in this rank.
						rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].push(CONSUMABLES_REFERENCE_FIELD);
					}
				}
			}

			// In order to avoid adding duplicate ranks, we need to retrieve the ID of the existing rank from the DB (if it exists). 
			// Ranks are defined by the rank, isPremium, and parentPass fields. We need to match all three.
			let existingRankResults = await wixData.query(PassConstants.PASS_RANK_DB)
				.eq(PassConstants.PASS_RANK_RANK_FIELD, rankDbJson[PassConstants.PASS_RANK_RANK_FIELD])
				.eq(PassConstants.PASS_RANK_IS_PREMIUM_FIELD, rankDbJson[PassConstants.PASS_RANK_IS_PREMIUM_FIELD])
				.eq(PassConstants.PASS_RANK_PARENT_PASS_FIELD, rankDbJson[PassConstants.PASS_RANK_PARENT_PASS_FIELD])
				.find()
				.catch((error) => {
					console.error(error + " occurred while looking for existing rank matching ", rankDbJson);
					throw error;
				});

			if (existingRankResults && existingRankResults.items.length > 0) {
				if (existingRankResults.items.length > 1) {
					throw "Error: Found too many ranks for given " + [PassConstants.PASS_RANK_RANK_FIELD] + ", " + [PassConstants.PASS_RANK_IS_PREMIUM_FIELD] + ", and " +
					[PassConstants.PASS_RANK_PARENT_PASS_FIELD] + "values. Uniqueness was assumed. Found " + existingRankResults.items.length + " ranks for " +
					rankDbJson[PassConstants.PASS_RANK_RANK_FIELD] + ", " + rankDbJson[PassConstants.PASS_RANK_IS_PREMIUM_FIELD] + ", and " +
					rankDbJson[PassConstants.PASS_RANK_PARENT_PASS_FIELD];
				}
				else {
					// Found exactly one item. 
					rankDbJson._id = existingRankResults.items[0]._id;
				}
			}

			//console.log("Rank " + rankDbJson.rank + " has been added and linked to its consumables, if any.");
			//#endregion

			//#region Process the customization rewards.

			let customizationArray = ((isPremium) ? rank.premiumItems : rank.freeItems);

			for (let j = 0; j < customizationArray.length; j++) {
				let itemType = customizationArray[j].itemType;
				let itemWaypointId = customizationArray[j].itemId;
				let itemTypeMatched = false; // This lets us detect if our item actually got processed or not.


				for (let k = 0; k < CustomizationConstants.IS_CUSTOMIZATION_ARRAY.length; ++k) {
					const CUSTOMIZATION_CATEGORY = CustomizationConstants.IS_CUSTOMIZATION_ARRAY[k];
					//if (itemType in Customization.CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[CUSTOMIZATION_CATEGORY]) {
					if (typeDict[CUSTOMIZATION_CATEGORY].includes(itemType)) {
						itemTypeMatched = true;
						// We might be updating a Core. Let's check first.
						if (itemType.includes("Core")) {
							// We're updating a core. There aren't any source type references, so we just need to update the source and currently available status.
							// First, we need to get the existing Core item.
							const CORE_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreDb;
							const CORE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreWaypointIdField;
							const CORE_DEFAULT_ITEMS_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreDefaultItemsField;

							await wixData.query(CORE_DB)
								.eq(CORE_WAYPOINT_ID_FIELD, itemWaypointId)
								.include(CORE_DEFAULT_ITEMS_FIELD)
								.find()
								.then(async (results) => {
									if (results.items.length > 0) {
										if (results.items.length > 1) {
											throw "Error: Found too many items for given ID. Uniqueness was assumed. Found " + results.items.length + " items";
										}
										// We found our core. Time to update the source if necessary and mark the item according to its availability.
										let matchingCore = results.items[0]; // There should only be one item at this point.
										let itemChanged = false; // If this is true, we want to save changes to the item.

										const PASS_RANK_CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT[CUSTOMIZATION_CATEGORY];

										rankDbJson[PASS_RANK_CORE_REFERENCE_FIELD].push(matchingCore._id);

										// Note that we have this type of core in this rank.
										if (!rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].includes(PASS_RANK_CORE_REFERENCE_FIELD)) {
											rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].push(PASS_RANK_CORE_REFERENCE_FIELD);
										}

										const CORE_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreCurrentlyAvailableField;
										if (matchingCore[CORE_CURRENTLY_AVAILABLE_FIELD] != currentlyAvailable) {
											matchingCore[CORE_CURRENTLY_AVAILABLE_FIELD] = currentlyAvailable;
											itemChanged = true;
										}

										// If the source text needs to be updated, let's do it.
										const CORE_SOURCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreSourceField;
										let sourceText = "Reach Level " + rankDbJson.rank + " in the Season " + seasonNumber + " " + ((isEvent) ? "Event" : "Battle") + " Pass <em>" +
											passName.trim() + "</em>" + ((isEvent) ? "" : (" " + ((isPremium) ? "(Paid)" : "(Free)")));

										if (matchingCore[CORE_SOURCE_FIELD].includes("Pending")) {
											matchingCore[CORE_SOURCE_FIELD] = sourceText;
											itemChanged = true;
										}
										else if (!matchingCore[CORE_SOURCE_FIELD].includes(sourceText)) {
											matchingCore[CORE_SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
											itemChanged = true;
										}

										// Let's update the default items for this core.
										const CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationCurrentlyAvailableField;
										const CUSTOMIZATION_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSourceField;
										const CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSourceTypeField;
										const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationDb;

										for (let i = 0; i < matchingCore[CORE_DEFAULT_ITEMS_FIELD].length; ++i) {
											let item = matchingCore[CORE_DEFAULT_ITEMS_FIELD][i];
											if (item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] != currentlyAvailable) {
												item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] = currentlyAvailable;
												itemChanged = true;
											}

											if (item[CUSTOMIZATION_SOURCE_FIELD].includes("Pending")) {
												item[CUSTOMIZATION_SOURCE_FIELD] = sourceText;
												itemChanged = true;
											}
											else if (!item[CUSTOMIZATION_SOURCE_FIELD].includes(sourceText)) {
												item[CUSTOMIZATION_SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
												itemChanged = true;
											}

											// If this is an Event Pass, use the Event Pass source ID. If it isn't, but is premium, use Battle Pass (Paid). Otherwise, use Battle Pass (Free).
											let sourceIdToUse = ((isEvent) ? CustomizationConstants.SOURCE_TYPE_EVENT_PASS_ID
												: ((isPremium) ? CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_PAID_ID : CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_FREE_ID));

											// We only want to add a source type reference if it isn't already there. It won't hurt if it is, but it will change the Updated Datetime of the item.
											let sourceTypeReferenceIncludesDesiredId = false;

											let itemSourceTypes = (await wixData.queryReferenced(CUSTOMIZATION_DB, item._id, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)).items;

											for (let i = 0; i < itemSourceTypes.length; ++i) {
												if (itemSourceTypes[i]._id == sourceIdToUse) {
													sourceTypeReferenceIncludesDesiredId = true;
													break;
												}
											}

											// We also need to update or replace the sourcetype. Thankfully, we included this field.
											if (itemSourceTypes.length == 1 &&
												itemSourceTypes[0]._id == CustomizationConstants.SOURCE_TYPE_PENDING_ID) {
												// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
												wixData.replaceReferences(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [sourceIdToUse])
													.then(() => {
														console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
													})
													.catch((error) => {
														console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
														throw error;
													});
											}
											else if (!sourceTypeReferenceIncludesDesiredId) {
												// We just want to insert the source type in this case.
												wixData.insertReference(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [sourceIdToUse])
													.then(() => {
														console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
													})
													.catch((error) => {
														console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
														throw error;
													});
											}

											if (itemChanged) {
												// Update the customizationItem.
												wixData.update(CUSTOMIZATION_DB, item)
													.catch((error) => {
														console.error(error + " occurred while saving Customization Item changes to " + CUSTOMIZATION_DB + " with ID " + itemWaypointId);
														throw error;
													});
											}
										}

										if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(CUSTOMIZATION_CATEGORY)) {
											const CORE_DEFAULT_ATTACHMENTS_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreDefaultAttachmentsField;
											const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].AttachmentKey;

											const ATTACHMENT_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationCurrentlyAvailableField;
											const ATTACHMENT_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationSourceField;
											const ATTACHMENT_SOURCE_TYPE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationSourceTypeField;
											const ATTACHMENT_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;

											// We also need to process attachments.
											let attachmentList = (await wixData.queryReferenced(CORE_DB, matchingCore._id, CORE_DEFAULT_ATTACHMENTS_FIELD)).items;

											for (let i = 0; i < attachmentList.length; ++i) {
												let item = attachmentList[i];
												if (item[ATTACHMENT_CURRENTLY_AVAILABLE_FIELD] != currentlyAvailable) {
													item[ATTACHMENT_CURRENTLY_AVAILABLE_FIELD] = currentlyAvailable;
													itemChanged = true;
												}

												if (item[ATTACHMENT_SOURCE_FIELD].includes("Pending")) {
													item[ATTACHMENT_SOURCE_FIELD] = sourceText;
													itemChanged = true;
												}
												else if (!item[ATTACHMENT_SOURCE_FIELD].includes(sourceText)) {
													item[ATTACHMENT_SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
													itemChanged = true;
												}

												// If this is an Event Pass, use the Event Pass source ID. If it isn't, but is premium, use Battle Pass (Paid). Otherwise, use Battle Pass (Free).
												let sourceIdToUse = ((isEvent) ? CustomizationConstants.SOURCE_TYPE_EVENT_PASS_ID
													: ((isPremium) ? CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_PAID_ID : CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_FREE_ID));

												// We only want to add a source type reference if it isn't already there. It won't hurt if it is, but it will change the Updated Datetime of the item.
												let sourceTypeReferenceIncludesDesiredId = false;

												let itemSourceTypes = (await wixData.queryReferenced(ATTACHMENT_DB, item._id, ATTACHMENT_SOURCE_TYPE_FIELD)).items;

												for (let i = 0; i < itemSourceTypes.length; ++i) {
													if (itemSourceTypes[i]._id == sourceIdToUse) {
														sourceTypeReferenceIncludesDesiredId = true;
														break;
													}
												}

												// We also need to update or replace the sourcetype. Thankfully, we included this field.
												if (itemSourceTypes.length == 1 &&
													itemSourceTypes[0]._id == CustomizationConstants.SOURCE_TYPE_PENDING_ID) {
													// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
													wixData.replaceReferences(ATTACHMENT_DB, ATTACHMENT_SOURCE_TYPE_FIELD, item._id, [sourceIdToUse])
														.then(() => {
															console.log("Added source type reference for item " + item._id + " in DB " + ATTACHMENT_DB);
														})
														.catch((error) => {
															console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + ATTACHMENT_DB);
															throw error;
														});
												}
												else if (!sourceTypeReferenceIncludesDesiredId) {
													// We just want to insert the source type in this case.
													wixData.insertReference(ATTACHMENT_DB, ATTACHMENT_SOURCE_TYPE_FIELD, item._id, [sourceIdToUse])
														.then(() => {
															console.log("Added source type reference for item " + item._id + " in DB " + ATTACHMENT_DB);
														})
														.catch((error) => {
															console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + ATTACHMENT_DB);
															throw error;
														});
												}

												if (itemChanged) {
													// Update the customizationItem.
													wixData.update(ATTACHMENT_DB, item)
														.catch((error) => {
															console.error(error + " occurred while saving Customization Item changes to " + ATTACHMENT_DB + " with ID " + itemWaypointId);
															throw error;
														});
												}
                                            }
                                        }


										if (itemChanged) {
											const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CoreNameField;
											console.warn("Updated a Core as part of the Pass processing: " + matchingCore[CORE_WAYPOINT_ID_FIELD] + ", " + matchingCore[CORE_NAME_FIELD]);

											// Update the core.
											wixData.update(CORE_DB, matchingCore)
												.catch((error) => {
													console.error(error + " occurred while saving Core changes to " + CORE_DB + " with ID " + itemWaypointId);
													throw error;
												});
										}
									}
									else {
										throw "Error: No results found";
									}
								})
								.catch((error) => {
									console.error(error + " occurred while retrieving Core from " + CORE_DB + " with ID " + itemWaypointId);
									throw error;
								});
						}
						else { // This is a normal customization item.
							const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationDb;
							const CUSTOMIZATION_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationWaypointIdField;
							const CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD =
								CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSourceTypeField;
							const CUSTOMIZATION_CROSS_COMPATIBLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationCrossCompatibleField;
							

							await wixData.query(CUSTOMIZATION_DB)
								.eq(CUSTOMIZATION_WAYPOINT_ID_FIELD, itemWaypointId)
								.include(CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)
								.find()
								.then(async (results) => {
									if (results.items.length > 0) {
										if (results.items.length > 1) {
											throw "Error: Found too many items for given ID. Uniqueness was assumed. Found " + results.items.length + " items";
										}
										// We found our core. Time to update the source if necessary and mark the item according to its availability.
										let matchingItemFound = results.items[0]; // There should only be one item at this point.
										let itemChanged = false; // If this is true, we want to make changes to the item itself.

										let matchingItemArray = [];
										let matchingItemCategories = []; // The customization category for each item in the matching item array.

										// Initialize the arrays with the item we've already found.
										matchingItemArray.push(matchingItemFound);
										matchingItemCategories.push(CUSTOMIZATION_CATEGORY);

										// If this is a cross-compatible emblem and this pass is from season 5 or later.
										if (matchingItemFound[CUSTOMIZATION_CROSS_COMPATIBLE_FIELD] && itemType.includes("Emblem") && seasonAtOrAfter5(seasonNumber)) {
											// We need to fetch each related emblem.
											const POSSIBLE_CATEGORIES = [
												ArmorConstants.ARMOR_KEY,
												WeaponConstants.WEAPON_KEY,
												VehicleConstants.VEHICLE_KEY,
												SpartanIdConstants.SPARTAN_ID_KEY
											];

											let matches = matchingItemFound[CUSTOMIZATION_WAYPOINT_ID_FIELD].match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);
											let waypointIdSuffix = "";
											if (matches.length > 0) {
												waypointIdSuffix = matches[0];
											}

											// Fetch each of the related emblems.
											for (let q = 0; q < POSSIBLE_CATEGORIES.length; ++q) {
												if (!matchingItemCategories.includes(POSSIBLE_CATEGORIES[q])) {
													const CURRENT_CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[POSSIBLE_CATEGORIES[q]].CustomizationDb;
													const CURRENT_CUSTOMIZATION_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[POSSIBLE_CATEGORIES[q]].CustomizationWaypointIdField;
													const CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD =
														CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[POSSIBLE_CATEGORIES[q]].CustomizationSourceTypeField;

													matchingItemCategories.push(POSSIBLE_CATEGORIES[q]);

													let currentMatchingItem = await wixData.query(CURRENT_CUSTOMIZATION_DB)
														.contains(CURRENT_CUSTOMIZATION_WAYPOINT_ID_FIELD, waypointIdSuffix)
														.include(CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)
														.find()
														.then((results) => {
															if (results.items.length > 1) {
																throw "Error: Found too many items for given ID suffix " + waypointIdSuffix + ". Uniqueness was assumed. Found " + results.items.length + " items";
															}
															else if (results.items.length == 0) {
																throw "Error: Found no items for given ID suffix " + waypointIdSuffix + " in the " + CURRENT_CUSTOMIZATION_DB + " DB.";
															}

															return results.items[0];
														});

													matchingItemArray.push(currentMatchingItem);
												}
											}
										}
										// If this is a cross-compatible coating and this pass is from season 5 or later.
										else if (matchingItemFound[CUSTOMIZATION_CROSS_COMPATIBLE_FIELD] && itemType.includes("Coating") && seasonAtOrAfter5(seasonNumber)) {
											// We need to fetch all related coatings. Thankfully these don't reside in other DBs, so this can be done with one quick query.
											let matches = matchingItemFound[CUSTOMIZATION_WAYPOINT_ID_FIELD].match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);
											let waypointIdSuffix = "";
											if (matches.length > 0) {
												waypointIdSuffix = matches[0];
											}

											let matchingItems = await wixData.query(CUSTOMIZATION_DB)
												.contains(CUSTOMIZATION_WAYPOINT_ID_FIELD, waypointIdSuffix)
												.include(CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)
												.find()
												.then((results) => {
													if (results.items.length > 0) {
														return results.items;
													}
													else if (results.items.length == 0) {
														throw "Error: Found no items for given ID suffix " + waypointIdSuffix + " in the " + CUSTOMIZATION_DB + " DB.";
													}
												});
											
											for (let q = 0; q < matchingItems.length; ++q) {
												if (matchingItems[q]._id !== matchingItemFound._id) {
													matchingItemArray.push(matchingItems[q]);
													matchingItemCategories.push(CUSTOMIZATION_CATEGORY);
												}
											}
										}

										for (let q = 0; q < matchingItemArray.length; ++q) {
											let matchingItem = matchingItemArray[q];
											let matchingCategory = matchingItemCategories[q];

											const CURRENT_CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[matchingCategory].CustomizationDb;
											const CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD 
												= CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[matchingCategory].CustomizationSourceTypeField;

											const PASS_RANK_CUSTOMIZATION_REFERENCE_FIELD =
												CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_REFERENCE_FIELD_DICT[matchingCategory];

											rankDbJson[PASS_RANK_CUSTOMIZATION_REFERENCE_FIELD].push(matchingItem._id);

											// Note that we have this type of customization item in this rank.
											if (!rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].includes(PASS_RANK_CUSTOMIZATION_REFERENCE_FIELD)) {
												rankDbJson[PassConstants.PASS_RANK_FIELDS_WITH_ITEMS_FIELD].push(PASS_RANK_CUSTOMIZATION_REFERENCE_FIELD);
											}

											const CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD =
												CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[matchingCategory].CustomizationCurrentlyAvailableField;

											if (matchingItem[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] != currentlyAvailable) {
												matchingItem[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] = currentlyAvailable;
												itemChanged = true;
											}

											const CUSTOMIZATION_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[matchingCategory].CustomizationSourceField

											let sourceText = "Reach Level " + rankDbJson.rank + " in the Season " + seasonNumber + " " + ((isEvent) ? "Event" : "Battle") + " Pass <i>" +
												passName.trim() + "</i>" + ((isEvent) ? "" : (" " + ((isPremium) ? "(Paid)" : "(Free)")));

											// If the source text needs to be updated, let's do it.
											if (matchingItem[CUSTOMIZATION_SOURCE_FIELD].includes("Pending")) {
												matchingItem[CUSTOMIZATION_SOURCE_FIELD] = sourceText;
												itemChanged = true;
											}
											else if (!matchingItem[CUSTOMIZATION_SOURCE_FIELD].includes(sourceText)) {
												matchingItem[CUSTOMIZATION_SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
												itemChanged = true;
											}

											// If this is an Event Pass, use the Event Pass source ID. If it isn't, but is premium, use Battle Pass (Paid). Otherwise, use Battle Pass (Free).
											let sourceIdToUse = ((isEvent) ? CustomizationConstants.SOURCE_TYPE_EVENT_PASS_ID
												: ((isPremium) ? CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_PAID_ID : CustomizationConstants.SOURCE_TYPE_BATTLE_PASS_FREE_ID));

											// We only want to add a source type reference if it isn't already there. It won't hurt if it is, but it will change the Updated Datetime of the item.
											let sourceTypeReferenceIncludesDesiredId = false;

											for (let i = 0; i < matchingItem[CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD].length; ++i) {
												if (matchingItem[CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD][i]._id == sourceIdToUse) {
													sourceTypeReferenceIncludesDesiredId = true;
													break;
												}
											}

											// We also need to update or replace the sourcetype. Thankfully, we included this field.
											if (matchingItem[CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD].length == 1 &&
												matchingItem[CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD][0]._id == CustomizationConstants.SOURCE_TYPE_PENDING_ID) {
												// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
												wixData.replaceReferences(CURRENT_CUSTOMIZATION_DB, CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, matchingItem._id, [sourceIdToUse])
													.then(() => {
														console.log("Added source type reference for item " + matchingItem._id + " in DB " + CURRENT_CUSTOMIZATION_DB);
													})
													.catch((error) => {
														console.error("Error", error, "occurred while adding source type reference for item " + matchingItem._id + " in DB " + CURRENT_CUSTOMIZATION_DB);
														throw error;
													});
											}
											else if (!sourceTypeReferenceIncludesDesiredId) {
												// We just want to insert the source type in this case.
												wixData.insertReference(CURRENT_CUSTOMIZATION_DB, CURRENT_CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, matchingItem._id, [sourceIdToUse])
													.then(() => {
														console.log("Added source type reference for item " + matchingItem._id + " in DB " + CURRENT_CUSTOMIZATION_DB);
													})
													.catch((error) => {
														console.error("Error", error, "occurred while adding source type reference for item " + matchingItem._id + " in DB " + CURRENT_CUSTOMIZATION_DB);
														throw error;
													});
											}

											if (itemChanged) {
												// Update the customizationItem.
												wixData.update(CURRENT_CUSTOMIZATION_DB, matchingItem)
													.catch((error) => {
														console.error(error + " occurred while saving Customization Item changes to " + CUSTOMIZATION_DB + " with ID " + itemWaypointId);
														throw error;
													});
											}
										}
									}
									else {
										throw "Error: No results found";
									}
								})
								.catch((error) => {
									console.error(error + " occurred while retrieving Customization Item from " + CUSTOMIZATION_DB + " with ID " + itemWaypointId);
									throw error;
								});
						}
					}
				}

				if (!itemTypeMatched) {
					console.warn("Discovered item with type " + itemType + " that does not fit within an expected category.");
				}
			}

			//console.log(rankDbJson);

			// Add the rank to the DB. We'll need the ID shortly. First, though, make a copy.
			let rankJsonCopy = structuredClone(rankDbJson);

			let rankSaveResult = await wixData.save(PassConstants.PASS_RANK_DB, rankJsonCopy);
			let rankId = rankSaveResult._id;

			// Finally, we need to add the items to our rank.
			for (let k = 0; k < CustomizationConstants.IS_CUSTOMIZATION_ARRAY.length; ++k) {
				const CUSTOMIZATION_CATEGORY = CustomizationConstants.IS_CUSTOMIZATION_ARRAY[k];
				const CUSTOMIZATION_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_REFERENCE_FIELD_DICT[CUSTOMIZATION_CATEGORY];
				if (rankDbJson[CUSTOMIZATION_REFERENCE_FIELD].length > 0) { // Only add arrays with contents.
					let retry = true;
					let retryCount = 0;

					while (retry && retryCount < maxRetries) {
						await wixData.replaceReferences(PassConstants.PASS_RANK_DB, CUSTOMIZATION_REFERENCE_FIELD, rankId, rankDbJson[CUSTOMIZATION_REFERENCE_FIELD])
							.then(() => {
								retry = false;
								//console.log("Added these item references to the " + customizationReferenceField + " field of the " + rankId + " rank", rankDbJson[customizationReferenceField]);
							})
							.catch((error) => {
								console.error(error + " occurred while trying to add these item references to the " + CUSTOMIZATION_REFERENCE_FIELD + " field of the " + rankId +
									" rank. Try " + (++retryCount) + " of " + maxRetries + ".", rankDbJson[CUSTOMIZATION_REFERENCE_FIELD]);
							});
					}
				}

				// Add the cores if necessary.
				if (CUSTOMIZATION_CATEGORY in CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT) {
					const CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT[CUSTOMIZATION_CATEGORY];
					if (rankDbJson[CORE_REFERENCE_FIELD].length > 0) { // Only add arrays with contents.
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.replaceReferences(PassConstants.PASS_RANK_DB, CORE_REFERENCE_FIELD, rankId, rankDbJson[CORE_REFERENCE_FIELD])
								.then(() => {
									retry = false;
									//console.log("Added these item references to the " + coreReferenceField + " field of the " + rankId + " rank", rankDbJson[coreReferenceField]);
								})
								.catch((error) => {
									console.error(error + " occurred while trying to add these item references to the " + CORE_REFERENCE_FIELD + " field of the " + rankId +
										" rank. Try " + (++retryCount) + " of " + maxRetries + ".", rankDbJson[CORE_REFERENCE_FIELD]);
								});
						}
					}
				}
			}

			// Now, add the Consumables references to the item. We don't need this to be awaited.
			if (rankDbJson[CONSUMABLES_REFERENCE_FIELD].length > 0) {
				await wixData.replaceReferences(PassConstants.PASS_RANK_DB, CONSUMABLES_REFERENCE_FIELD, rankId, rankDbJson[CONSUMABLES_REFERENCE_FIELD])
					.catch((error) => {
						console.error(error + " occurred while trying to add these item references to the " + CONSUMABLES_REFERENCE_FIELD + " field of the " + rankId +
							" rank.", rankDbJson[CONSUMABLES_REFERENCE_FIELD]);
					});
			}
			//#endregion

			overallRetry = false;
		}
		catch (error) {
			console.error(error + " occurred while processing Pass Rank. Try " + (++overallRetryCount) + " of " + maxRetries, rank);
		}
	}
}

// This function adds or updates the ranks for the provided pass. Free ranks are added separately from paid ranks if both exist.
// This assumes that all the items have already been added to the DB.
export async function updateRanksInDb(rankArray, passDbId, currentlyAvailable, seasonNumber, isEvent, passName, typeDict) {

	// There's only 4 consumables so this would be the easiest way to quickly get the desired IDs.
	let consumableDbResults = await wixData.query(ConsumablesConstants.CONSUMABLES_DB).find();
	let consumableDbJsons = consumableDbResults.items;

	let consumableNameToIdDict = {}; // This dictionary will use consumable names as keys and their DB IDs as values.

	for (let j = 0; j < consumableDbJsons.length; j++) {
		consumableNameToIdDict[consumableDbJsons[j][ConsumablesConstants.CONSUMABLES_NAME_FIELD]] = consumableDbJsons[j]._id;
	}

	for (let i = 0; i < rankArray.length; ++i) {
		let rank = rankArray[i];
		// This lets us process both free and premium rewards.
		processRank(rank, passDbId, consumableNameToIdDict, currentlyAvailable, seasonNumber, isEvent, passName, false, typeDict)
			.then(() => {
				//console.log("Added rank ", rank);
			})
			.catch((error) => {
				console.error(error + " occurred in processRank function and ended execution.");
			});

		processRank(rank, passDbId, consumableNameToIdDict, currentlyAvailable, seasonNumber, isEvent, passName, true, typeDict)
			.then(() => {
				//console.log("Added rank ", rank);
			})
			.catch((error) => {
				console.error(error + " occurred in processRank function and ended execution.");
			});

		await GeneralFunctions.sleep(1000);
	}
}

// Returns the Waypoint IDs of the Battle/Event Passes that are already marked as currentlyAvailable in the DB.
export async function getPreviouslyAvailablePassWaypointIdsFromDb() {
	return await wixData.query(PassConstants.PASS_DB)
		.eq(PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD, true)
		.find()
		.then((results) => {
			let waypointIdArray = [];
			for (let i = 0; i < results.items.length; ++i) {
				waypointIdArray.push(results.items[i][PassConstants.PASS_WAYPOINT_ID_FIELD]);
			}

			return waypointIdArray;
		});

}

// This function generates the Twitter and Discord notifications
export async function generatePassSocialNotifications(newlyAvailablePasses) {

	for (let i = 0; i < newlyAvailablePasses.length; ++i) {
		let mainTweetText;
		if (newlyAvailablePasses[i][PassConstants.PASS_IS_EVENT_FIELD]) {
			mainTweetText = "The #HaloInfinite " + newlyAvailablePasses[i][PassConstants.PASS_TITLE_FIELD] +
				" Event is now live. Check out the Event Pass here. " + GeneralConstants.INFINITE_NEWS_URL_BASE + newlyAvailablePasses[i][PassConstants.PASS_URL_FIELD];
		} else {
			mainTweetText = "The Season " + newlyAvailablePasses[i].seasonNum + " Battle Pass " +
				newlyAvailablePasses[i][PassConstants.PASS_TITLE_FIELD] + " is now available. View the details here. "
				+ GeneralConstants.INFINITE_NEWS_URL_BASE + newlyAvailablePasses[i][PassConstants.PASS_URL_FIELD];
		}

		console.log(mainTweetText);
		TwitterFunctions.sendTweet(mainTweetText);
		await DiscordFunctions.sendDiscordMessage("weekly-reset", mainTweetText, true);
	}
}

// This function imports all passes and updates the currentlyAvailable values of said passes.
export async function importPasses() {
	let previouslyAvailablePassWaypointIds = await getPreviouslyAvailablePassWaypointIdsFromDb();

	let headers = await ApiFunctions.makeWaypointHeaders();
	let passSummaryJson = await ApiFunctions.getCustomizationItem(headers, ApiConstants.WAYPOINT_URL_SUFFIX_PROGRESSION_SEASON_CALENDAR);

	let folderDict;
	let results = await wixData.query(KeyConstants.KEY_VALUE_DB) // This might still be a bit inefficient. Consider moving query out and passing folderDict as arg.
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + CustomizationConstants.CUSTOMIZATION_CATEGORY_FOLDER_DICT[PassConstants.PASS_KEY] + "/")
		.find();

	if (results.items.length > 0) {
		folderDict = results.items[0].value;
	}
	else {
		throw "Could not retrieve folder dict. Cannot get customization image Info.";
	}

	let newlyAvailablePasses = []; // We want to be able to reference the currently available passes to send out notifications about what's available.

	let passListJsonDict = {}; // Each Pass Item will have this format: 
	/*
	{ 
		title: [Name], 
		waypointId: [TrackId],
		isEvent: [IsRitual],
		image: [SummaryImagePath],
		description: [Description],
		dateRangeText: [DateRange],
		currentlyAvailable: [true if current date between any start and end date pair for the pass],
		season: [Reference to the Season whose number matches OperationNumber]
		dateRangeArray: [{ start: [startDate], end: [endDate] }, ...], 
		ranks: [rankArray], // This won't be added directly but will be iterated over to add all the individual ranks to the DB.
		seasonNum: [OperationNumber] // This also won't be added directly but is needed for rank processing.
	}
	*/
	// Pass items are accessible by using the path as a key.

	let currentIsoTime = new Date().getTime(); // We need this to determine whether each pass is active.

	const maxRetries = 10;

	for (let i = 0; i < passSummaryJson.Seasons.length; ++i) {
		let retry = true;
		let retryCount = 0;

		while (retry && retryCount < maxRetries) {
			try {
				let battlePassPath = passSummaryJson.Seasons[i].OperationTrackPath;

				let startDate = new Date(passSummaryJson.Seasons[i].StartDate.ISO8601Date);
				let endDate = new Date(passSummaryJson.Seasons[i].EndDate.ISO8601Date);

				let currentlyAvailable = (startDate.getTime() <= currentIsoTime && currentIsoTime < endDate.getTime());

				if (battlePassPath in passListJsonDict) {
					// We've already processed this before, but we should get the start and end dates and append those just in case.
					passListJsonDict[battlePassPath][PassConstants.PASS_DATE_RANGE_ARRAY_FIELD].push({
						[PassConstants.PASS_DATE_RANGE_ARRAY_START_DATE_FIELD]: startDate,
						[PassConstants.PASS_DATE_RANGE_ARRAY_END_DATE_FIELD]: endDate
					});

					if (!passListJsonDict[battlePassPath][PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD] && currentlyAvailable) {
						// Even though we don't need to do the full processing, this pass is actually available right now.
						passListJsonDict[battlePassPath][PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD] = true;
						if (!previouslyAvailablePassWaypointIds.includes(passListJsonDict[battlePassPath][PassConstants.PASS_WAYPOINT_ID_FIELD])) {
							newlyAvailablePasses.push(passListJsonDict[battlePassPath]);

							// If we have a new Battle Pass, we almost certainly have a new Season. We need to mark the previous season as unavailable and mark this one as current.
							let currentReleaseResults = await wixData.query(CustomizationConstants.RELEASE_DB)
								.eq(CustomizationConstants.RELEASE_IS_CURRENT_FIELD, true)
								.find();

							let currentRelease = {};
							for (let i = 0; i < currentReleaseResults.items.length; ++i) { // Marking all active releases as inactive.
								currentRelease = currentReleaseResults.items[i];
								currentRelease[CustomizationConstants.RELEASE_IS_CURRENT_FIELD] = false;

								let updateResults = await wixData.update(CustomizationConstants.RELEASE_DB, currentRelease);
								console.log("Results after updating Season " + currentRelease[CustomizationConstants.RELEASE_ORDINAL_FIELD] + " to be inactive.", updateResults);
							}

							let releaseResults = await wixData.query(CustomizationConstants.RELEASE_DB) // Get the season associated with this pass.
								.eq("_id", passListJsonDict[battlePassPath][PassConstants.PASS_SEASON_FIELD])
								.find();

							if (releaseResults.items.length > 0) {
								let newRelease = releaseResults.items[0];
								newRelease[CustomizationConstants.RELEASE_IS_CURRENT_FIELD] = true;

								let updateResults = await wixData.update(CustomizationConstants.RELEASE_DB, newRelease);
								console.log("Results after updating Season " + newRelease[CustomizationConstants.RELEASE_ORDINAL_FIELD] + " to be active.", updateResults);
							}
							else {
								console.warn("Unable to find Release item with ID " + passListJsonDict[battlePassPath][PassConstants.PASS_SEASON_FIELD] + ". Cannot mark it active.");
							}
						}
					}

					retry = false;
					continue;
				}

				let passWaypointJsonResults = await ApiFunctions.getCustomizationItem(headers, battlePassPath, true);

				let passWaypointJson = passWaypointJsonResults[0];
				let passWaypointETag = passWaypointJsonResults[1]; // We extract the ETag here for comparison with the one we have in the database.

				// We need to get the site ID of the Season to which this item belongs. We'll query the Releases DB for items with a matching ordinal.
				let releaseResults = await wixData.query(CustomizationConstants.RELEASE_DB)
					.eq(CustomizationConstants.RELEASE_ORDINAL_FIELD, passWaypointJson.OperationNumber)
					.find();

				let seasonId = "";

				if (releaseResults.items.length > 0) {
					let item = releaseResults.items[0]; // We'll assume we only returned one thing. What's the worst that could happen?
					seasonId = item._id;
				}
				else {
					throw "Could not find matching Season for OperationNumber " + passWaypointJson.OperationNumber;
				}

				let description = "No Description was provided by Waypoint."; // We default our description to this and change it only if it's not the empty string in the Waypoint JSON.

				if (passWaypointJson.Description != "") {
					description = passWaypointJson.Description;
				}

				let rankArray = await getPassList(battlePassPath, headers);
				let passSiteJson = {
					[PassConstants.PASS_TITLE_FIELD]: passWaypointJson.Name,
					[PassConstants.PASS_WAYPOINT_ID_FIELD]: passWaypointJson.TrackId,
					[PassConstants.PASS_IS_EVENT_FIELD]: passWaypointJson.IsRitual, // This should always be false.
					[PassConstants.PASS_IMAGE_FIELD]: passWaypointJson.SummaryImagePath,
					[PassConstants.PASS_DESCRIPTION_FIELD]: description,
					[PassConstants.PASS_DATE_RANGE_TEXT_FIELD]: passWaypointJson.DateRange,
					[PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD]: currentlyAvailable,
					[PassConstants.PASS_SEASON_FIELD]: seasonId,
					[PassConstants.PASS_DATE_RANGE_ARRAY_FIELD]: [{
						[PassConstants.PASS_DATE_RANGE_ARRAY_START_DATE_FIELD]: startDate,
						[PassConstants.PASS_DATE_RANGE_ARRAY_END_DATE_FIELD]: endDate
					}],
					[PassConstants.PASS_ETAG_FIELD]: passWaypointETag,
					ranks: rankArray,
					seasonNum: passWaypointJson.OperationNumber
				};

				passListJsonDict[battlePassPath] = passSiteJson;
				if (currentlyAvailable && !previouslyAvailablePassWaypointIds.includes(passListJsonDict[battlePassPath][PassConstants.PASS_WAYPOINT_ID_FIELD])) {
					newlyAvailablePasses.push(passListJsonDict[battlePassPath]);

					// If we have a new Battle Pass, we almost certainly have a new Season. We need to mark the previous season(s) as unavailable and mark this one as current.
					let currentReleaseResults = await wixData.query(CustomizationConstants.RELEASE_DB)
						.eq(CustomizationConstants.RELEASE_IS_CURRENT_FIELD, true)
						.find();

					let currentRelease = {};
					for (let i = 0; i < currentReleaseResults.items.length; ++i) { // Marking all active releases as inactive.
						currentRelease = currentReleaseResults.items[i];
						currentRelease[CustomizationConstants.RELEASE_IS_CURRENT_FIELD] = false;

						let updateResults = await wixData.update(CustomizationConstants.RELEASE_DB, currentRelease);
						console.log("Results after updating Season " + currentRelease[CustomizationConstants.RELEASE_ORDINAL_FIELD] + " to be inactive.", updateResults);
					}

					let newRelease = releaseResults.items[0]; // This is the season we retrieved earlier. We know it exists.
					newRelease[CustomizationConstants.RELEASE_IS_CURRENT_FIELD] = true;

					let updateResults = await wixData.update(CustomizationConstants.RELEASE_DB, newRelease);
					console.log("Results after updating Season " + newRelease[CustomizationConstants.RELEASE_ORDINAL_FIELD] + " to be active.", updateResults);
				}

				retry = false;
			}
			catch (error) {
				console.error("Error " + error + " occurred when trying to add " + passSummaryJson.Seasons[i].OperationTrackPath + ". Try " + (++retryCount) + " of " + maxRetries + ".");
			}
		}
	}

	for (let i = 0; i < passSummaryJson.Events.length; ++i) {
		let retry = true;
		let retryCount = 0;

		while (retry && retryCount < maxRetries) {
			try {
				let eventPassPath = passSummaryJson.Events[i].RewardTrackPath;

				let startDate = new Date(passSummaryJson.Events[i].StartDate.ISO8601Date);
				let endDate = new Date(passSummaryJson.Events[i].EndDate.ISO8601Date);

				let currentlyAvailable = (startDate.getTime() <= currentIsoTime && currentIsoTime < endDate.getTime());

				if (eventPassPath in passListJsonDict) {
					// We've already processed this before, but we should get the start and end dates and append those just in case.
					passListJsonDict[eventPassPath][PassConstants.PASS_DATE_RANGE_ARRAY_FIELD].push({
						[PassConstants.PASS_DATE_RANGE_ARRAY_START_DATE_FIELD]: startDate,
						[PassConstants.PASS_DATE_RANGE_ARRAY_END_DATE_FIELD]: endDate
					});

					if (!passListJsonDict[eventPassPath][PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD] && currentlyAvailable) { // Even though we don't need to do the full processing, this pass is actually available right now.
						passListJsonDict[eventPassPath][PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD] = true;
						if (!previouslyAvailablePassWaypointIds.includes(passListJsonDict[eventPassPath][PassConstants.PASS_WAYPOINT_ID_FIELD])) {
							newlyAvailablePasses.push(passListJsonDict[eventPassPath]);
						}
					}

					retry = false;
					continue;
				}

				let passWaypointJsonResults = await ApiFunctions.getCustomizationItem(headers, eventPassPath, true);

				let passWaypointJson = passWaypointJsonResults[0];
				let passWaypointETag = passWaypointJsonResults[1]; // We extract the ETag here for comparison with the one we have in the database.

				// We need to get the site ID of the Season to which this item belongs. We'll query the Releases DB for items with a matching ordinal.
				let results = await wixData.query(CustomizationConstants.RELEASE_DB)
					.eq(CustomizationConstants.RELEASE_ORDINAL_FIELD, passWaypointJson.OperationNumber)
					.find();

				let seasonId = "";

				if (results.items.length > 0) {
					let item = results.items[0]; // We'll assume we only returned one thing. What's the worst that could happen?
					seasonId = item._id;
				}
				else {
					throw "Could not find matching Season for OperationNumber " + passWaypointJson.OperationNumber;
				}

				let description = "No Description was provided by Waypoint."; // We default our description to this and change it only if it's not the empty string in the Waypoint JSON.

				if (passWaypointJson.Description != "") {
					description = passWaypointJson.Description;
				}

				let rankArray = await getPassList(eventPassPath, headers);
				let passSiteJson = {
					[PassConstants.PASS_TITLE_FIELD]: passWaypointJson.Name,
					[PassConstants.PASS_WAYPOINT_ID_FIELD]: passWaypointJson.TrackId,
					[PassConstants.PASS_IS_EVENT_FIELD]: passWaypointJson.IsRitual, // This should always be true.
					[PassConstants.PASS_IMAGE_FIELD]: passWaypointJson.SummaryImagePath, // This will be replaced at DB insertion time once we ensure it's the up-to-date version.
					[PassConstants.PASS_DESCRIPTION_FIELD]: description,
					[PassConstants.PASS_DATE_RANGE_TEXT_FIELD]: passWaypointJson.DateRange,
					[PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD]: currentlyAvailable,
					[PassConstants.PASS_SEASON_FIELD]: seasonId,
					[PassConstants.PASS_DATE_RANGE_ARRAY_FIELD]: [{
						[PassConstants.PASS_DATE_RANGE_ARRAY_START_DATE_FIELD]: startDate,
						[PassConstants.PASS_DATE_RANGE_ARRAY_END_DATE_FIELD]: endDate
					}],
					[PassConstants.PASS_ETAG_FIELD]: passWaypointETag,
					ranks: rankArray,
					seasonNum: passWaypointJson.OperationNumber
				};

				passListJsonDict[eventPassPath] = passSiteJson;

				if (currentlyAvailable && !previouslyAvailablePassWaypointIds.includes(passListJsonDict[eventPassPath][PassConstants.PASS_WAYPOINT_ID_FIELD])) {
					newlyAvailablePasses.push(passListJsonDict[eventPassPath]);
				}

				retry = false;
			}
			catch (error) {
				console.error("Error " + error + " occurred when trying to add " + passSummaryJson.Events[i].RewardTrackPath + ". Try " + (++retryCount) + " of " + maxRetries + ".");

				if (retryCount >= maxRetries) {
					throw "Error: Too many retries occurred. Exiting to avoid data poisoning.";
				}
			}
		}
	}

	console.log("Passes to process: ", passListJsonDict);

	let passListCopyDict = structuredClone(passListJsonDict);

	for (let battlePassPath in passListCopyDict) {
		// This just cleans up the JSON so that adding it to the DB doesn't try to add a nonexistent field.
		delete passListCopyDict[battlePassPath].ranks;
		delete passListCopyDict[battlePassPath].seasonNum;

		let updatedItem = await updatePassInDb(passListCopyDict[battlePassPath], folderDict, headers);

		passListJsonDict[battlePassPath].passDbId = updatedItem._id;
		passListJsonDict[battlePassPath].passETagChanged = updatedItem.passETagChanged;

		// Get the URL field so we can link to the pass in our notifications.
		newlyAvailablePasses.some((pass) => {
			if (pass[PassConstants.PASS_WAYPOINT_ID_FIELD] == updatedItem[PassConstants.PASS_WAYPOINT_ID_FIELD]) {
				pass[PassConstants.PASS_URL_FIELD] = updatedItem[PassConstants.PASS_URL_FIELD];
			}
		});
	}

	generatePassSocialNotifications(newlyAvailablePasses);

	let typeDict = await GeneralBackendFunctions.generateTypeDict(true);

	for (let battlePassPath in passListJsonDict) {
		if (!passListJsonDict[battlePassPath].passETagChanged) { // If the ETag wasn't different, we skip processing.
			console.log("Skipping the " + passListJsonDict[battlePassPath][PassConstants.PASS_TITLE_FIELD] + " pass since it has not changed...");
			continue;
		}

		let rankArray = passListJsonDict[battlePassPath].ranks;
		let seasonNum = passListJsonDict[battlePassPath].seasonNum;
		let isEvent = passListJsonDict[battlePassPath][PassConstants.PASS_IS_EVENT_FIELD];
		let passName = passListJsonDict[battlePassPath][PassConstants.PASS_TITLE_FIELD];
		let passDbId = passListJsonDict[battlePassPath].passDbId;
		passListJsonDict[battlePassPath].ranks = [];
		//console.log("Validate these variables now:", passDbId, rankArray);

		// We need to determine if we should flag all child items in the pass as available or not. Battle Passes stick around permanently, so we just use true in that case.
		// Event Passes are limited-time, so we need to base the availability on whether the pass itself is active.
		let itemsCurrentlyAvailable = ((passListJsonDict[battlePassPath][PassConstants.PASS_IS_EVENT_FIELD]) ?
			passListJsonDict[battlePassPath][PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD] : true);

		updateRanksInDb(rankArray, passDbId, itemsCurrentlyAvailable, seasonNum, isEvent, passName, typeDict)
			.then(() => {
				console.log("Finished triggering rank addition for " + passName + " (ID: " + passDbId + ")");
			})
			.catch((error) => {
				console.error(error + " occurred when trying to update the ranks for the " + passName + " Pass");
			});
	}
}

// This function returns the JSON representation of the player's current Challenge decks.
export async function getCurrentChallengeDecks() {
	// The headers for this request are quite unique. If we try to pass a 343 Clearance value, it will forbid us from access. We also want to force a JSON response since it's easier for us.
	let spartanToken = await ApiFunctions.getSpartanToken(false);
	let headers = {
		[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER]: spartanToken,
		"Accept": "application/json, text/plain, */*"
	}
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);
	let retry = true;

	let currentChallengeDecksJson = {};

	const URL = ApiConstants.WAYPOINT_URL_BASE_HALOSTATS + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_HALOSTATS_DECKS;

	while (retry) {
		currentChallengeDecksJson = await wixFetch.fetch(URL, {
			"method": "get",
			"headers": headers
		})
			.then((httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				}
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			})
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});

		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await ApiFunctions.getSpartanToken();

			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}

	return currentChallengeDecksJson;
}

// This function gets the current Capstone Challenge JSON from Waypoint. It can be configured to return multiple active capstone challenges in the future should the need arise.
export async function getCurrentCapstoneChallengeJson(headers) {
	let currentChallengeDecksJson = await getCurrentChallengeDecks();
	for (let i = 0; i < currentChallengeDecksJson.AssignedDecks.length; ++i) {
		let deckJson = await ApiFunctions.getCustomizationItem(headers, currentChallengeDecksJson.AssignedDecks[i].Path);
		if (deckJson.CapstoneChallengePath) {
			return await ApiFunctions.getCustomizationItem(headers, deckJson.CapstoneChallengePath);
		}
	}
}

// Gets the current Capstone Challenge JSON from Waypoint and converts it to a site JSON object.
export async function getCurrentCapstoneChallengeDbJson() {
	let headers = await ApiFunctions.makeWaypointHeaders();

	let typeDict = await GeneralBackendFunctions.generateTypeDict();

	let capstoneChallengeJson = await getCurrentCapstoneChallengeJson(headers);
	let challengeDbJson = {};

	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD] = capstoneChallengeJson.Title;
	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] = capstoneChallengeJson.Description;
	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD] = true;

	let lastAvailableDatetime = new Date();
	lastAvailableDatetime.setHours(18, 0, 0, 0); // This sets the datetime to today's date with the time 18:00:00.000 UTC.

	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_LAST_AVAILABLE_DATETIME_FIELD] = lastAvailableDatetime;
	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD] = capstoneChallengeJson.ThresholdForSuccess;
	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_XP_REWARD_FIELD] = capstoneChallengeJson.Reward.OperationExperience;

	let includedItemsArray = capstoneChallengeJson.Reward.InventoryRewards;

	// Initialize the item arrays.
	for (const FIELD in CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT) {
		challengeDbJson[FIELD] = [];
	}

	// Initialize the field names with items arrays.
	challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD] = [];

	for (let j = 0; j < includedItemsArray.length; j++) {
		let foundType = false; // Should become true if the type is found.
		for (let typeCategory in typeDict) {
			if (typeDict[typeCategory].includes(includedItemsArray[j].Type)) { // If the ItemType belongs to this typeCategory.
				let possibleMultiCore = false;

				foundType = true; // We found the type.
				let waypointIdMatchArray = includedItemsArray[j].InventoryItemPath.match(GeneralConstants.REGEX_WAYPOINT_ID_FROM_PATH); // We'll be parsing this info from the path now.
				let waypointId = "";
				if (waypointIdMatchArray.length > 0) {
					waypointId = waypointIdMatchArray[0]; 
					//console.log(waypointId);
				}

				let exactWaypointId = waypointId;

				let typeCategoryArray = [typeCategory];

				if (includedItemsArray[j].Type.includes("Emblem")) {
					// Emblems marked as cross compatible award all variants at once (Armor Emblem, Weapon Emblem, Vehicle Emblem, Nameplate).
					// Related emblems share the tail end of their waypoint IDs.
					let matches = waypointId.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

					if (matches.length > 0) {
						waypointId = matches[0];
					}

					let possibleTypeCategories = [
						ArmorConstants.ARMOR_KEY,
						WeaponConstants.WEAPON_KEY,
						VehicleConstants.VEHICLE_KEY,
						SpartanIdConstants.SPARTAN_ID_KEY
					];

					for (let q = 0; q < possibleTypeCategories.length; ++q) {
						if (!typeCategoryArray.includes(possibleTypeCategories[q])) {
							typeCategoryArray.push(possibleTypeCategories[q]);
						}
					}
				}	

				if (includedItemsArray[j].Type.includes("Coating")) {
					// Coatings marked as cross compatible award all variants on all cores at once.
					// Related coatings share the tail end of their waypoint IDs.
					possibleMultiCore = true;

					let matches = waypointId.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

					if (matches.length > 0) {
						waypointId = matches[0];
					}
				}							

				for (let q = 0; q < typeCategoryArray.length; ++q) {
					let currentTypeCategory = typeCategoryArray[q];
					const CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[currentTypeCategory].CapstoneChallengeReferenceField;
					
					let itemId = "";
					let itemIdArray = []; // This will only be used if possibleMultiCore is set.
					try {
						if (possibleMultiCore) {
							itemIdArray = await ShopFunctions.getItemId(currentTypeCategory, waypointId, possibleMultiCore, exactWaypointId);
						}
						else {
							itemId = await ShopFunctions.getItemId(currentTypeCategory, waypointId);
						}
					}
					catch (error) {
						console.error("Couldn't get item ID for waypoint ID " + waypointId + " due to " + error);
						console.log("Querying API for Waypoint ID...");
						let itemJson = await ApiFunctions.getCustomizationItem(headers, includedItemsArray[j].InventoryItemPath);

						if (possibleMultiCore) {
							let matches = itemJson.CommonData.Id.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

							if (matches.length > 0) {
								waypointId = matches[0];
							}

							itemIdArray = await ShopFunctions.getItemId(currentTypeCategory, waypointId, possibleMultiCore, itemJson.CommonData.Id);
						}
						else {
							itemId = await ShopFunctions.getItemId(currentTypeCategory, itemJson.CommonData.Id);
							
							let matches = itemJson.CommonData.Id.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

							if (matches.length > 0) {
								waypointId = matches[0];
							}
						}
					}

					if (possibleMultiCore) {
						for (let q = 0; q < itemIdArray.length; ++q) {
							if (!challengeDbJson[CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD].includes(itemIdArray[q])) {
								challengeDbJson[CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD].push(itemIdArray[q]);
							}
						}
					}
					else {
						if (!challengeDbJson[CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD].includes(itemId)) {
							challengeDbJson[CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD].push(itemId);
						}
					}

				/*foundType = true;
				let waypointIdMatchArray = includedItemsArray[j].InventoryItemPath.match(GeneralConstants.REGEX_WAYPOINT_ID_FROM_PATH); // We'll be parsing this info from the path now.
				let waypointId = "";
				if (waypointIdMatchArray.length > 0) {
					waypointId = waypointIdMatchArray[0]; 
					//console.log(waypointId);
				}

				const CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[typeCategory].CapstoneChallengeReferenceField;
				let itemId = "";
				try {
					itemId = await ShopFunctions.getItemId(typeCategory, waypointId);
				}
				catch (error) {
					console.error("Couldn't get item ID for waypoint ID " + waypointId + " due to " + error);
					console.log("Querying API for Waypoint ID...");
					let itemJson = await ApiFunctions.getCustomizationItem(headers, includedItemsArray[j].InventoryItemPath);
					itemId = await ShopFunctions.getItemId(typeCategory, itemJson.CommonData.Id);
				}
				
				challengeDbJson[CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD].push(itemId);*/

					if (!challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD].includes(CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD)) {
						challengeDbJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD].push(CAPSTONE_CHALLENGE_ITEM_REFERENCE_FIELD);
					}
				}

				break;
			}
		}

		if (foundType) {
			continue;
		}
		else {
			console.warn("Discovered item with type " + includedItemsArray[j].Type + " that does not fit within an expected category.");
		}
	}

	return challengeDbJson;
}

// Gets the Capstone Challenges from the DB that are currently marked as available.
export async function getPreviousAvailableCapstoneChallenge() {
	let currentlyAvailableCapstoneChallenges = await wixData.query(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB)
		.eq(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD, true)
		.find()
		.then((results) => {
			return results.items;
		})
		.catch((error) => {
			console.error("Error occurred while retrieving previously available Capstone Challenges from DB: " + error);
			return [];
		});

	// We need to get the multi-references for each capstone challenge; namely, the items each challenge includes.
	for (let i = 0; i < currentlyAvailableCapstoneChallenges.length; ++i) {
		for (let j = 0; j < currentlyAvailableCapstoneChallenges[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD].length; ++j) {
			const FIELD = currentlyAvailableCapstoneChallenges[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][j];
			currentlyAvailableCapstoneChallenges[i][FIELD] =
				await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, currentlyAvailableCapstoneChallenges[i]._id, FIELD)
					.then((results) => {
						let idArray = [];
						results.items.forEach((item) => {
							idArray.push(item._id);
						});

						return idArray;
					})
					.catch((error) => {
						console.error("Error occurred while retrieving previously available Capstone Challenges from DB: " + error);
						return [];
					});
		}
	}

	console.log("Currently available Capstone Challenges, ", currentlyAvailableCapstoneChallenges);

	return currentlyAvailableCapstoneChallenges;
}

export async function addItemIdArrayToCapstoneChallenge(challengeId, fieldName, itemIdArray, customizationCategory, challengeName) {

	if (itemIdArray.length <= 0) {
		//console.log("No processing necessary as itemIdArray is empty for " + customizationCategory + " and Capstone Challenge Name " + challengeName);
		return [];
	}

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	wixData.replaceReferences(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, fieldName, challengeId, itemIdArray, options)
		.then(() => {
			//console.log("Added references for Capstone Challenge item ", challengeId, " and fieldName ", fieldName);
		})
		.catch((error) => {
			console.error("Error", error, "occurred. Failed to add references for Shop item ", challengeId, " and fieldName ", fieldName);
		});

	let itemInfoArray = []; // We're going to add the item Info to this array and return it.

	// We have three tasks for each item ID: update the source (if it is (Pending) or Pending), update the sourcetype reference, and mark it currently Available.
	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	const SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;
	const CUSTOMIZATION_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
	const CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;

	await wixData.query(CUSTOMIZATION_DB)
		.hasSome("_id", itemIdArray)
		.include(SOURCE_TYPE_REFERENCE_FIELD)
		.include(CUSTOMIZATION_TYPE_REFERENCE_FIELD)
		.find()
		.then(async (results) => {
			if (results.items.length > 0) {
				let items = results.items;
				let itemsToUpdate = []; // We only update items that need to be changed.
				for (let i = 0; i < items.length; ++i) {
					let item = items[i];
					let itemChanged = false;
					if (!item[CURRENTLY_AVAILABLE_FIELD]) {
						item[CURRENTLY_AVAILABLE_FIELD] = true;
						itemChanged = true;
					}

					// We need to update the source
					const SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceField;
					let sourceText = "Complete all Weekly Challenges and then complete the <i>" + challengeName.trim() + "</i> Capstone Challenge during any week it is available.";

					if (item[SOURCE_FIELD].includes("Pending")) {
						item[SOURCE_FIELD] = sourceText;
						itemChanged = true;
					}
					else if (!item[SOURCE_FIELD].includes(sourceText)) {
						item[SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
						itemChanged = true;
					}

					if (itemChanged) {
						// Add the item to the list of items to change.
						itemsToUpdate.push(item);
					}

					// We only want to add a source type reference if it isn't already there. It won't hurt if it is, but it will change the Updated Datetime of the item.
					let sourceTypeReferenceIncludesDesiredId = false;

					for (let i = 0; i < item[SOURCE_TYPE_REFERENCE_FIELD].length; ++i) {
						if (item[SOURCE_TYPE_REFERENCE_FIELD][i]._id == CustomizationConstants.SOURCE_TYPE_CAPSTONE_CHALLENGE_ID) {
							sourceTypeReferenceIncludesDesiredId = true;
							break;
						}
					}

					// We also need to update or replace the sourcetype. Thankfully, we included this field.
					if (item[SOURCE_TYPE_REFERENCE_FIELD].length == 1 && item[SOURCE_TYPE_REFERENCE_FIELD][0]._id == CustomizationConstants.SOURCE_TYPE_PENDING_ID) {
						// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
						wixData.replaceReferences(CUSTOMIZATION_DB, SOURCE_TYPE_REFERENCE_FIELD, item._id, [CustomizationConstants.SOURCE_TYPE_CAPSTONE_CHALLENGE_ID])
							.then(() => {
								console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
							})
							.catch((error) => {
								console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
							});
					}
					else if (!sourceTypeReferenceIncludesDesiredId) {
						// We just want to insert the source type in this case.
						wixData.insertReference(CUSTOMIZATION_DB, SOURCE_TYPE_REFERENCE_FIELD, item._id, [CustomizationConstants.SOURCE_TYPE_CAPSTONE_CHALLENGE_ID])
							.then(() => {
								console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
							})
							.catch((error) => {
								console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
							});
					}

					let itemType;
					const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
					itemType = item[CUSTOMIZATION_TYPE_REFERENCE_FIELD][SOCKET_NAME_FIELD];

					let itemCore = "";

					if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
						// If we have cores for this item.
						const CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
						const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;

						let parentCores = (await wixData.queryReferenced(CUSTOMIZATION_DB, item._id, CORE_REFERENCE_FIELD)).items;

						// We only care about the parent core if there's at least one core the item works with and the core isn't the "Any" shortcut.
						if (parentCores.length >= 1 && parentCores[0][CORE_NAME_FIELD] != "Any") {
							itemCore = parentCores[0][CORE_NAME_FIELD];
							for (let q = 1; q < parentCores.length; ++q) {
								itemCore += ", " + parentCores[q][CORE_NAME_FIELD];
							}
						}
					}

					const NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField
					const URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_URL_FIELDS[customizationCategory];
					itemInfoArray.push({
						itemName: item[NAME_FIELD],
						itemUrl: GeneralConstants.INFINITE_NEWS_URL_BASE + item[URL_FIELD],
						itemType: itemType,
						itemCore: itemCore
					});
				}

				console.log("Found the following items", items, "Only updating source and currentlyAvailable for these items", itemsToUpdate);

				wixData.bulkUpdate(CUSTOMIZATION_DB, itemsToUpdate, options)
					.then((results) => {
						console.log("Results following update of currentlyAvailable and source for category", customizationCategory, "and items", itemsToUpdate, ":", results);
					});
			}
		})
		.catch((error) => {
			console.error("Error", error, "occurred while updating newly available items for category", customizationCategory, "and ID array", itemIdArray);
		});

	return itemInfoArray;
}

async function addCapstoneChallengeToDb(capstoneChallengeJson) {
	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let capstoneChallengeJsonCopy = structuredClone(capstoneChallengeJson); // This ensures that insertions don't throw out our multi-references.

	console.log("Adding Capstone Challenge " + capstoneChallengeJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]);

	let addedBundle = await wixData.insert(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, capstoneChallengeJsonCopy, options) // This needs to await since we need the URL from the bundle for Twitter API stuff.
		.then((results) => {
			console.log("Inserted this bundle to the Capstone Challenge DB: ", results);

			return results;
		})
		.catch((error) => {
			console.error("Error", error, "occurred while attempting to add this Bundle to DB:", capstoneChallengeJsonCopy);
		});

	addedBundle.childItemInfo = []; // This array will contain dictionaries of item names, types, and links that point to each reward item's page.
	for (const FIELD in CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT) {
		addedBundle.childItemInfo = addedBundle.childItemInfo.concat(await addItemIdArrayToCapstoneChallenge(
			addedBundle._id,
			FIELD,
			capstoneChallengeJson[FIELD],
			CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[FIELD],
			capstoneChallengeJson[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]
		));
	}

	return addedBundle;
}

// This function generates the Twitter and Discord notifications
export async function generateCapstoneSocialNotifications(updateItemArray) {

	for (let i = 0; i < updateItemArray.length; ++i) {
		console.log("Checking to see if this challenge is new/returning.", updateItemArray[i]);
		let lastAvailableDatetime = new Date(updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_LAST_AVAILABLE_DATETIME_FIELD]);
		let returning;
		if (new Date(lastAvailableDatetime.toDateString()) < new Date(new Date().toDateString())) { // If the lastAvailableDatetime is before today, the item is returning.
			returning = true;
		}
		else {
			returning = false;
		}

		let todaysDatetime = new Date();

		let dateString = GeneralFunctions.getLongMonthDayYearFromDate(todaysDatetime);

		let mainTweetText = "Ultimate Challenge, Week of " + dateString + "\n"
			+ updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD] + "\n"
			+ " - " + updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] + ": " +
			updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD];

		if (returning) {
			let lastAvailableDateString = GeneralFunctions.getLongMonthDayYearFromDate(lastAvailableDatetime);
			mainTweetText += "\n - Last Available: " + lastAvailableDateString;
		}

		console.log(mainTweetText);
		let parentId = await TwitterFunctions.sendTweet(mainTweetText);
		await DiscordFunctions.sendDiscordMessage("weekly-reset", mainTweetText, true);

		console.log(updateItemArray[i].childItemInfo);

		const NUM_ARMOR_CORES = await getNumCores(ArmorConstants.ARMOR_KEY);
		const NUM_WEAPON_CORES = await getNumCores(WeaponConstants.WEAPON_KEY);
		const NUM_VEHICLE_CORES = await getNumCores(VehicleConstants.VEHICLE_KEY);

		let emblemNamesToSkip = [];
		let armorCoatingNamesToSkip = [];
		let weaponCoatingNamesToSkip = [];
		let vehicleCoatingNamesToSkip = [];

		for (let j = 0; j < updateItemArray[i].childItemInfo.length; ++j) {
			let childItem = updateItemArray[i].childItemInfo[j];
			if (childItem.itemCore === "None") {
				continue; // We don't need to report items that can't be equipped.
			}

			let childItemText = "Reward: " + childItem.itemName + " " + childItem.itemType + ((childItem.itemCore != "") ? (" (" + childItem.itemCore + ")") : "") + "\n" + childItem.itemUrl;
			// We want to abbreviate sets of four identical emblem types as "Emblem Set". This will shorten our Tweet count considerably.
			if (childItem.itemType.includes("Nameplate") || childItem.itemType.includes("Emblem")) {
				if (emblemNamesToSkip.includes(childItem.itemName)) { // We already noted this Emblem Set. Let's proceed.
					continue;
				}

				let matchingEmblemsFound = 0; // Count the number of matching emblems in the list.
				updateItemArray[i].childItemInfo.forEach((item) => {
					if (item.itemName == childItem.itemName && (item.itemType.includes("Nameplate") || item.itemType.includes("Emblem"))) {
						++matchingEmblemsFound;
					}
				});

				if (matchingEmblemsFound >= 4) { // If we found all four types of emblem in the list.
					childItemText = "Reward: " + childItem.itemName + " Emblem Set\n" + GeneralConstants.INFINITE_NEWS_URL_BASE + updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_URL_FIELD];
					emblemNamesToSkip.push(childItem.itemName);
				}
			}

			// We also want to abbreviate sets of coatings into a single aggregate.
			if (childItem.itemType.includes("Coating")) {
				if (childItem.itemType.includes("Armor Coating") && armorCoatingNamesToSkip.includes(childItem.itemName)
				|| childItem.itemType.includes("Weapon Coating") && weaponCoatingNamesToSkip.includes(childItem.itemName)
				|| childItem.itemType.includes("Vehicle Coating") && vehicleCoatingNamesToSkip.includes(childItem.itemName)) { // We already noted this Coating. Let's proceed.
					continue;
				}

				let matchingCoatingsFound = 0; // Count the number of matching coatings in the list.
				updateItemArray[i].childItemInfo.forEach((item) => {
					if (item.itemName == childItem.itemName && item.itemType == childItem.itemType) {
						++matchingCoatingsFound;
					}
				});

				if (childItem.itemType.includes("Armor Coating") && matchingCoatingsFound >= NUM_ARMOR_CORES
				|| childItem.itemType.includes("Weapon Coating") && matchingCoatingsFound >= NUM_WEAPON_CORES
				|| childItem.itemType.includes("Vehicle Coating") && matchingCoatingsFound >= NUM_VEHICLE_CORES) { // If we found an instance of the coating on all available cores.
					childItemText = "Reward: " + childItem.itemName + " " + childItem.itemType + " (All Cores)\n" + GeneralConstants.INFINITE_NEWS_URL_BASE 
						+ updateItemArray[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_URL_FIELD];
					
					if (childItem.itemType.includes("Armor Coating")) { armorCoatingNamesToSkip.push(childItem.itemName); }
					if (childItem.itemType.includes("Weapon Coating")) { weaponCoatingNamesToSkip.push(childItem.itemName); }
					if (childItem.itemType.includes("Vehicle Coating")) { vehicleCoatingNamesToSkip.push(childItem.itemName); }
				}
			}
			
			console.log(childItemText);
			parentId = await TwitterFunctions.sendTweet(childItemText, parentId);
			await DiscordFunctions.sendDiscordMessage("weekly-reset", childItemText);
		}
	}
}

// This function can be called by the job scheduler to update the Capstone Challenge each week.
export async function updateCapstoneChallenge() {
	let currentlyAvailableCapstoneChallenge = await getPreviousAvailableCapstoneChallenge(); // This is an array.
	let newlyAvailableCapstoneChallenge = [await getCurrentCapstoneChallengeDbJson()]; // This function does not currently return an array.

	// The challenges appear to have unique names and reward IDs. We can just check to see if each currently available item is in the newlyAvailable list, and if not, we mark it as not currently available.
	let newlyAvailableCapstoneChallengeNames = [];
	let newlyAvailableCapstoneChallengeRewardIds = [];
	let currentlyAvailableCapstoneChallengeNames = []; // We need this array so that we can check the newly available challenge and see if we already have it available.
	let currentlyAvailableCapstoneChallengeRewardIds = [];

	for (let i = 0; i < newlyAvailableCapstoneChallenge.length; ++i) {
		newlyAvailableCapstoneChallengeNames.push(newlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]);

		let fieldWithItems = newlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0]; // We'll just check the first item since these only have one reward for now.
		newlyAvailableCapstoneChallengeRewardIds.push(newlyAvailableCapstoneChallenge[i][fieldWithItems][0]);
	}

	for (let i = 0; i < currentlyAvailableCapstoneChallenge.length; ++i) {
		currentlyAvailableCapstoneChallengeNames.push(currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]);

		let fieldWithItems = currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0]; // We'll just check the first item since these only have one reward for now.
		currentlyAvailableCapstoneChallengeRewardIds.push(currentlyAvailableCapstoneChallenge[i][fieldWithItems][0]);
	}

	let previousChallengeSeason = -1;
	let previousChallengeWeek = -1;

	for (let i = 0; i < currentlyAvailableCapstoneChallenge.length; ++i) { // Should only be one of these, hopefully.
		let fieldWithItems = currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0];
		if (!(newlyAvailableCapstoneChallengeNames.includes(currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD])) // If the name doesn't match
			|| !(newlyAvailableCapstoneChallengeRewardIds.includes(currentlyAvailableCapstoneChallenge[i][fieldWithItems][0]))) { // or the reward ID doesn't match
			// This is a challenge that is no longer available.
			if (currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD].length > 0) {
				previousChallengeSeason = currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD][0];
				// We want the most recent item in this array.
			}
			if (currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD].length > 0) {
				previousChallengeWeek = currentlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD][0];
				// This is the easiest way to get the week to update correctly.
			}

			ShopFunctions.updateBundleAndItemsCurrentlyAvailableStatus(currentlyAvailableCapstoneChallenge[i], false, CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB);
			// This doesn't need to be done synchronously thankfully.
		}
	}

	if (previousChallengeSeason == -1) {
		console.warn("Unable to get Previous Challenge Season. Using error default of -1.");
	}
	if (previousChallengeWeek == -1) {
		console.warn("Unable to get Previous Challenge Week. Using error default of -1");
	}

	let newCapstoneChallengeToUpdate = [];

	for (let i = 0; i < newlyAvailableCapstoneChallenge.length; ++i) {
		let fieldWithItems = newlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0];
		if (!currentlyAvailableCapstoneChallengeNames.includes(newlyAvailableCapstoneChallenge[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD])
		|| !(currentlyAvailableCapstoneChallengeRewardIds.includes(newlyAvailableCapstoneChallenge[i][fieldWithItems][0]))) { // or the reward ID doesn't match) {
			// If there's a listing not in the previously available array, we need to update it or add it and report that it's new.
			newCapstoneChallengeToUpdate.push(newlyAvailableCapstoneChallenge[i]);
		}
	}

	if (newlyAvailableCapstoneChallengeNames.length > 0) {
		// Now that we've got the old challenges being marked as no longer available, we need to mark the new challenges as currently available when they exist and add them when they don't.
		wixData.query(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB)
			.hasSome(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD, newlyAvailableCapstoneChallengeNames)
			.find()
			.then(async (results) => {
				let items = results.items;
				console.log("Items returned: ", items);
				let itemNames = [];
				let itemRewardIds = [];

				for (let i = 0; i < items.length; i++) {
					itemNames.push(items[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]);

					let itemFieldWithRewards = items[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0];

					let referencedReward = await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, items[i]._id, itemFieldWithRewards);
					itemRewardIds.push(referencedReward.items[0]._id);
				}

				let updateItemArray = [];

				console.log("Arrays to process:", itemNames, itemRewardIds, newCapstoneChallengeToUpdate);

				for (let i = 0; i < newCapstoneChallengeToUpdate.length; ++i) { // We're assuming everything else has been marked correctly. Big assumption, yes, but potentially more efficient.
					let item;
					let itemIndex = -1;
					
					let newItemFieldWithReward = newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0];

					for (let j = 0; j < itemNames.length; ++j) {
						if (itemNames[j] == newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]
						&& itemRewardIds[j] == newCapstoneChallengeToUpdate[i][newItemFieldWithReward][0]) {
							itemIndex = j;
							break;
						}
					}

					console.log("Item index is ", itemIndex, "for item name", newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD], "and reward", 
						newCapstoneChallengeToUpdate[i][newItemFieldWithReward][0]);
					
					if (itemIndex > -1) {
						item = items[itemIndex];
						newCapstoneChallengeToUpdate[i]._id = item._id; // The ID ties both items together, so we need to transfer it.

						// Add or update the available date array.
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD] =
							item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD] || [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD].unshift(
							newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_LAST_AVAILABLE_DATETIME_FIELD]);
						// We have to add this here because we need the existing array of datetimes.

						// Add or update the available Season array.
						let currentSeasonNum = -1; // The Season in which we are currently.
						let currentWeekNum = -1; // The week of the Season we are currently in.
						let currentReleaseResults = await wixData.query(CustomizationConstants.RELEASE_DB)
							.eq(CustomizationConstants.RELEASE_IS_CURRENT_FIELD, true)
							.find();

						if (currentReleaseResults.items.length > 0) {
							// Assuming that exactly one release is marked as current.
							currentSeasonNum = currentReleaseResults.items[0][CustomizationConstants.RELEASE_ORDINAL_FIELD];

							if (currentSeasonNum != previousChallengeSeason && previousChallengeSeason != -1) {
								// If we have a legitimate previousChallengeSeason that doesn't match.
								// Note that this means we might transition to a different season and have the season number fail to update.
								// This is less likely than unintentionally resetting the week number.
								previousChallengeWeek = 0;
							}
						}
						else {
							console.warn("Unable to find a current release. Assuming that release/Season has not changed since last week.");
							currentSeasonNum = previousChallengeSeason;
						}

						if (currentSeasonNum == -1) {
							console.error("Current Season Number is -1. Manual intervention required to correct issue.");
						}

						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD] =
							item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD] || [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD].unshift(currentSeasonNum);
						// We have to add this here because we need the existing array of seasons

						// Add or update the available Week array.
						if (previousChallengeWeek != -1) {
							currentWeekNum = previousChallengeWeek + 1; // This accounts for both valid possibilities (another week in same Season or first week in new Season).
						}
						else {
							console.error("Current Week Number is -1. Manual intervention required to correct issue.");
						}

						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD] =
							item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD] || [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD].unshift(currentWeekNum);
						// We have to add this here because we need the existing array of weeks

						console.log("Last added datetime for ", item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD], " is ",
							item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_LAST_AVAILABLE_DATETIME_FIELD]);
						console.log(newCapstoneChallengeToUpdate[i]);
						item.childItemInfo = await ShopFunctions.updateBundleAndItemsCurrentlyAvailableStatus(newCapstoneChallengeToUpdate[i], true,
							CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB);

						// Make sure we're reporting the latest information.
						item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] = newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD];
						item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD] = newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD];
					}
					else { // If we didn't find the item, we need to add it. This is a bit involved since we also have to add references for each of its multi-references.
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD] = [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_DATE_ARRAY_FIELD].unshift(
							newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_LAST_AVAILABLE_DATETIME_FIELD]);

						// Add the available Season array.
						let currentSeasonNum = -1; // The Season in which we are currently.
						let currentWeekNum = -1; // The week of the Season we are currently in.
						let currentReleaseResults = await wixData.query(CustomizationConstants.RELEASE_DB)
							.eq(CustomizationConstants.RELEASE_IS_CURRENT_FIELD, true)
							.find();

						if (currentReleaseResults.items.length > 0) {
							// Assuming that exactly one release is marked as current.
							currentSeasonNum = currentReleaseResults.items[0][CustomizationConstants.RELEASE_ORDINAL_FIELD];

							if (currentSeasonNum != previousChallengeSeason && previousChallengeSeason != -1) {
								// If we have a legitimate previousChallengeSeason that doesn't match.
								// Note that this means we might transition to a different season and have the season number fail to update.
								// This is less likely than unintentionally resetting the week number.
								previousChallengeWeek = 0;
							}
						}
						else {
							console.warn("Unable to find a current release. Assuming that release/Season has not changed since last week.");
							currentSeasonNum = previousChallengeSeason;
						}

						if (currentSeasonNum == -1) {
							console.error("Current Season Number is -1. Manual intervention required to correct issue.");
						}

						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD] = [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_SEASON_ARRAY_FIELD].unshift(currentSeasonNum);
						// We have to add this here because we need the existing array of seasons

						// Add or update the available Week array.
						if (previousChallengeWeek != -1) {
							currentWeekNum = previousChallengeWeek + 1; // This accounts for both valid possibilities (another week in same Season or first week in new Season).
						}
						else {
							console.error("Current Week Number is -1. Manual intervention required to correct issue.");
						}

						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD] = [];
						newCapstoneChallengeToUpdate[i][CapstoneChallengeConstants.CAPSTONE_CHALLENGE_AVAILABLE_WEEK_ARRAY_FIELD].unshift(currentWeekNum);
						// We have to add this here because we need the existing array of weeks

						item = await addCapstoneChallengeToDb(newCapstoneChallengeToUpdate[i]); // We need to await this if we want to integrate with the Twitter API.
					}

					updateItemArray.push(item);
				}

				console.log("Update item array:", updateItemArray);

				generateCapstoneSocialNotifications(updateItemArray);
			});
	}
}
