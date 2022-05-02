// These functions are used to retrieve the list of bundles currently sold in the Shop and add them to the Shop database.
// Let's follow this process:
// 1) Get a list of Shop items currently in the DB that are marked as Currently Available.
// 2) Get the list of current HCS and Main Shop items from Waypoint and add any that are missing thus far.
// 3) For any Shop items in our previous list that aren't in the new list, mark those as not Currently Available and do the same for their linked items.
// 4) Link the bundles to their included customization items. Mark those items as Currently Available and update their Source listings if necessary (if Source.includes("Pending")).
// 5) Create a Tweet indicating the Bundles that are newly available. If possible, create a thread with each successive Tweet containing a link to the Infinite News page for the Bundle.

// Import Wix functions and tools.
import wixData from 'wix-data';
import wixFetch from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

// Import 3rd party packages.
import structuredClone from '@ungap/structured-clone';

// Import constants.
import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as ApiConstants from 'public/Constants/ApiConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as GeneralConstants from 'public/Constants/GeneralConstants.js';

// Import helper functions.
import * as CustomizationFunctions from 'backend/CustomizationAutomationFunctions.jsw';
/*{
	XUID_KEY, getCustomizationItem, getCustomizationImageUrl, getGeneralDictsAndArraysFromDbs, getCategorySpecificDictsAndArraysFromDbs, getCustomizationDetailsFromWaypointJson, getCustomizationItemToSave,
	makeWaypointHeaders, getSpartanToken, getClearance,
	CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS, CUSTOMIZATION_CATEGORY_SPECIFIC_VARS, CUSTOMIZATION_CATEGORY_URL_FIELDS}
*/ 
import {sendTweet} from 'backend/TwitterApiFunctions.jsw';
import {sendDiscordMessage} from 'backend/DiscordBotFunctions.jsw';
import * as WaypointFunctions from 'backend/WaypointBackendFunctions.jsw';
import * as GeneralFunctions from 'public/General.js';
import * as GeneralBackendFunctions from 'backend/GeneralFunctions.jsw';


// Gets a list of all currently available shop items, including the items contained within bundles.
export async function getCurrentlyAvailableShopListings() {
	let currentlyAvailableShopListings = await wixData.query(ShopConstants.SHOP_DB)
		.eq(ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD, true)
		.find()
		.then((results) => {
			return results.items;
		})
		.catch ((error) => {
			console.error("Error occurred while retrieving currently available shop listings from DB: " + error);
			return [];
		});
	
	// We need to get the multi-references for each shop listing; namely, the items each listing includes.
	for (let i = 0; i < currentlyAvailableShopListings.length; ++i) {
		// We can actually improve the performance by only querying the fields with items.
		for (let j = 0; j < currentlyAvailableShopListings[i][ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].length; ++j) {
			let itemField = currentlyAvailableShopListings[i][ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD][j];
			currentlyAvailableShopListings[i][itemField] = await wixData.queryReferenced(ShopConstants.SHOP_DB, currentlyAvailableShopListings[i]._id, itemField)
				.then((results) => {
					let idArray = [];
					results.items.forEach((item) => {
						idArray.push(item._id);
					});

					return idArray;
				})
				.catch((error) => {
					console.error("Error occurred while retrieving currently available shop listings from DB: " + error);
					return [];
				});
		}
	}

	console.log("Currently available Shop Listings, ", currentlyAvailableShopListings);

	return currentlyAvailableShopListings;
}

// Gets list of Main Shop items from Waypoint.
export async function getMainShopListFromWaypoint(headers) {
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

	let retry = true;
	let waypointJson = {};

	let url = ApiConstants.WAYPOINT_URL_BASE_ECONOMY + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_ECONOMY_STORE_MAIN;

	while (retry) {
		waypointJson = await wixFetch.fetch(url, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});

		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();

			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}

	return waypointJson;
}

// Gets list of HCS Shop items from Waypoint.
export async function getHcsShopListFromWaypoint(headers) {
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

	let retry = true;
	let waypointJson = {};

	let url = ApiConstants.WAYPOINT_URL_BASE_ECONOMY + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_ECONOMY_STORE_HCS;

	while (retry) {
		waypointJson = await wixFetch.fetch(url, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});

		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}

	return waypointJson;
}

// Retrieves an item ID based on the JSON returned from Waypoint and some other efficiency arguments.
export async function getItemId(customizationCategory, waypointJson) {
	// It's time to select the item!
	let existingItem = {};

	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;

	await wixData.query(CUSTOMIZATION_DB)
		.eq(WAYPOINT_ID_FIELD, waypointJson.CommonData.Id)
		.find()
		.then((results) => {
			if (results.items.length == 1) { // This is the expected case for now. If cross-core occurs in the future, this will affect some things.
				existingItem = results.items[0];
			}
			else if (results.items.length > 1) { // This is unexpected.
				throw "Multiple items returned despite assumed uniqueness. Tried querying based on " + waypointJson.CommonData.Id;
			}
			else {
				existingItem = null;
			}
		});

	if (existingItem) {
		return existingItem._id;
	}
	else {
		return null;
	}
}

// This function adds a Spartan ID item to the DB and returns its ID.
/*async function addSpartanIdItem(folderDict, headers, generalDictsAndArrays, categorySpecificDictsAndArrays, waypointJson) {
	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let customizationDetails = await getCustomizationDetailsFromWaypointJson(SpartanIdConstants.SPARTAN_ID_KEY, waypointJson);
	console.log("Following conversion from waypoint to site JSON customizationDetails: ", customizationDetails);

	let itemDbJson = await getCustomizationItemToSave(folderDict, headers, SpartanIdConstants.SPARTAN_ID_KEY, customizationDetails, generalDictsAndArrays, categorySpecificDictsAndArrays);

	return await wixData.save(KeyConstants.SPARTAN_ID_CUSTOMIZATION_DB, itemDbJson, options)
		.then((results) => {
			console.log("Results after adding Spartan ID item: ", results);
			return results._id;
		})
		.catch((error) => {
			console.error("Error ", error, " occurred while adding Spartan ID customization item to DB, ", itemDbJson);
		});
}*/

// Gets the list of Main and HCS Shop items from Waypoint, fetches the data for each item, and then returns a list of items that match the current DB items.
/*
	{
		"timeType": ["Indefinite"],
		"qualityReference": "d0034c71-1f95-4fe4-8328-bc2afef82c4d",
		"description": "Bundle includes the ANZ visor, nameplate, two emblems and a weapon coating.",
		"_id": "68af0d43-1e25-4a15-b295-60952a7a4a9e",
		"_owner": "ee59cff3-ece6-43df-8364-f1e15e800c56",
		"_createdDate": "2021-11-19T14:19:04.245Z",
		"_updatedDate": "2021-11-22T18:19:15.347Z",
		"lastAvailableDatetime": "2021-11-15T18:00:00.000Z",
		"isHcs": true,
		"numberOfChallengeSwaps": 0,
		"costCredits": 900,
		"itemName": "Australia and New Zealand",
		"currentlyAvailable": true,
		"numberOfXpBoosts": 0,
		"bundleImage": "wix:image://v1/ee59cf_ebffa15e9b72447abb756103b787c971~mv2.png/Australia%20and%20New%20Zealand%20Bundle.png#originWidth=419&originHeight=370",
		"link-shop-listings-itemName": "/shop-listings/68af0d43-1e25-4a15-b295-60952a7a4a9e",
		"link-shop-listings-all": "/shop-listings/",
		"armorItems": ["9a06dd2b-42a4-4048-992d-9d7169ffb7af", "c63e0caa-f464-4889-a465-fc707639d0e0"],
		"armorAttachmentItems": [],
		"weaponItems": ["73851810-2fa5-4f5c-b424-aa5e36f8b4dc", "defdcaf2-c602-43be-b2f3-ce25cd57cf68"],
		"vehicleItems": [],
		"bodyAiItems": [],
		"spartanIdItems": ["b98ab8f0-287c-49f1-91d4-59d597c1be71"],
		"consumables": []
	}
*/
export async function getConvertedShopList() {
	let headers = await CustomizationFunctions.makeWaypointHeaders();

	let typeDict = await GeneralBackendFunctions.generateTypeDict();

	let normalShopWaypointJson = await getMainShopListFromWaypoint(headers);
	let hcsShopListWaypoint = await getHcsShopListFromWaypoint(headers);

	let shopSiteArray = [];

	let folderDict;
	let results = await wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY)
		.find()

	if (results.items.length > 0) {
		folderDict = results.items[0].value;
	}
	else {
		throw "Could not retrieve folder dict. Cannot get customization image urls.";
	}

	let generalFolderDicts = await CustomizationFunctions.getGeneralDictsAndArraysFromDbs(headers);
	//let spartanIdCategorySpecificFolderDicts = await getCategorySpecificDictsAndArraysFromDbs(KeyConstants.SPARTAN_ID_KEY);

	const maxRetries = 10;

	for (let h = 0; h < 2; h++) { // We're just going to do the same stuff twice, first on the normal Shop, then on the HCS Shop.
		let mainShopWaypointJson = (h == 0) ? normalShopWaypointJson : hcsShopListWaypoint;
		let mainShopWaypointArray = mainShopWaypointJson.Offerings;

		for (let i = 0; i < mainShopWaypointArray.length; ++i) {
			let retryCount = 0;
			let retry = true;
			while (retry && retryCount < maxRetries) {
				try {
					let mainShopSiteJson = {};
					let shopWaypointJson = await CustomizationFunctions.getCustomizationItem(headers, mainShopWaypointArray[i].OfferingDisplayPath);

					switch (shopWaypointJson.FlairText) {
						case "Weekly":
							mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_WEEKLY];
							break;
						case "Daily":
							mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_DAILY];
							break;
						default:
							mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_INDEFINITE];
					}

					let qualityId = await wixData.query(CustomizationConstants.QUALITY_DB)
						.eq(CustomizationConstants.QUALITY_FIELD, shopWaypointJson.Quality)
						.find()
						.then((results) => {
							if (results.items.length > 0) {
								return results.items[0]._id;
							}
							else {
								throw "Could not locate quality matching " + shopWaypointJson.Quality;
							}
						})
						.catch((error) => {
							console.error("Error encountered when trying to find matching quality for ", shopWaypointJson, error);
						});

					mainShopSiteJson[ShopConstants.SHOP_QUALITY_REFERENCE_FIELD] = qualityId;
					mainShopSiteJson[ShopConstants.SHOP_DESCRIPTION_FIELD] = shopWaypointJson.Description;
					mainShopSiteJson[ShopConstants.SHOP_WAYPOINT_ID_FIELD] = mainShopWaypointArray[i].OfferingId;

					let lastAvailableDatetime = new Date();
					lastAvailableDatetime.setHours(18, 0, 0, 0); // This sets the datetime to today's date with the time 18:00:00.000 UTC.

					mainShopSiteJson[ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD] = lastAvailableDatetime;
					mainShopSiteJson[ShopConstants.SHOP_IS_HCS_FIELD] = (h == 1); // On the second iteration, we work on the HCS items, but on the first iteration, we deal with the normal items.

					let numChallengeSwaps = 0;
					for (let j = 0; j < mainShopWaypointArray[i].IncludedCurrencies.length; ++j) {
						if (mainShopWaypointArray[i].IncludedCurrencies[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_PATH_CONTENTS)) {
							// If this currency is a Challenge Swap
							numChallengeSwaps += mainShopWaypointArray[i].IncludedCurrencies[j].Amount;
						}
					}
					mainShopSiteJson[ShopConstants.SHOP_NUMBER_OF_CHALLENGE_SWAPS_FIELD] = numChallengeSwaps;

					let numXpBoosts = 0;
					for (let j = 0; j < mainShopWaypointArray[i].IncludedCurrencies.length; ++j) {
						if (mainShopWaypointArray[i].IncludedCurrencies[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_BOOST_PATH_CONTENTS)) {
							// If this currency is an XP Boost.
							numXpBoosts += mainShopWaypointArray[i].IncludedCurrencies[j].Amount;
						}
					}
					mainShopSiteJson[ShopConstants.SHOP_NUMBER_OF_XP_BOOSTS_FIELD] = numXpBoosts;

					let numXpGrants = 0;
					for (let j = 0; j < mainShopWaypointArray[i].IncludedCurrencies.length; ++j) {
						if (mainShopWaypointArray[i].IncludedCurrencies[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_GRANT_PATH_CONTENTS)) {
							// If this currency is an XP Grant.
							numXpGrants += mainShopWaypointArray[i].IncludedCurrencies[j].Amount;
						}
					}
					mainShopSiteJson[ShopConstants.SHOP_NUMBER_OF_XP_GRANTS_FIELD] = numXpGrants;

					let numCredits = 0;
					for (let j = 0; j < mainShopWaypointArray[i].IncludedCurrencies.length; ++j) {
						if (mainShopWaypointArray[i].IncludedCurrencies[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CREDITS_PATH_CONTENTS)) {
							// If this currency is Credits.
							numCredits += mainShopWaypointArray[i].IncludedCurrencies[j].Amount;
						}
					}
					mainShopSiteJson[ShopConstants.SHOP_NUMBER_OF_CREDITS_FIELD] = numCredits;

					// TODO: Make this more forward compatible if non-credit currencies or multiple currencies are introduced at some point.
					mainShopSiteJson[ShopConstants.SHOP_COST_CREDITS_FIELD] = mainShopWaypointArray[i].Prices[0].Cost;
					mainShopSiteJson[ShopConstants.SHOP_ITEM_NAME_FIELD] = shopWaypointJson.Title;
					mainShopSiteJson[ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD] = true;

					let bundleType = (mainShopSiteJson[ShopConstants.SHOP_IS_HCS_FIELD]) ? "HCS" : mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD][0];

					mainShopSiteJson[ShopConstants.SHOP_BUNDLE_IMAGE_FIELD] = await CustomizationFunctions.getCustomizationImageUrl(
						folderDict,
						headers,
						shopWaypointJson.Title,
						shopWaypointJson.ObjectImagePath,
						"image/png",
						ShopConstants.SHOP_KEY,
						bundleType
					);

					mainShopSiteJson[ShopConstants.SHOP_ARMOR_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_WEAPON_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_VEHICLE_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD] = [];
					mainShopSiteJson[ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD] = [];

					// Initialize the field names with items arrays.
					mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD] = [];

					let includedItemsArray = mainShopWaypointArray[i].IncludedItems;

					for (let j = 0; j < includedItemsArray.length; j++) {
						for (typeCategory in typeDict) {
							if (typeDict[typeCategory].includes(includedItemsArray[j].ItemType)) { // If the ItemType belongs to this typeCategory.
								let itemJson = await CustomizationFunctions.getCustomizationItem(headers, includedItemsArray[j].ItemPath);

								const SHOP_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[typeCategory].ShopReferenceField;
								mainShopSiteJson[SHOP_ITEM_REFERENCE_FIELD].push(await getItemId(typeCategory, itemJson));

								if (!mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].includes(SHOP_ITEM_REFERENCE_FIELD)) {
									mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].push(SHOP_ITEM_REFERENCE_FIELD);
								}

								continue;
                            }
						}

						console.warn("Discovered item with type " + includedItemsArray[j].ItemType + " that does not fit within an expected category.");

						/*if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.ARMOR_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);
							mainShopSiteJson.armorItems.push(await getItemId(KeyConstants.ARMOR_KEY, itemJson)); // Add the ID to our array.

							if (!mainShopSiteJson.fieldsWithItems.includes("armorItems")) {
								mainShopSiteJson.fieldsWithItems.push("armorItems");
							}
						}
						else if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.ARMOR_ATTACHMENT_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);
							mainShopSiteJson.armorAttachmentItems.push(await getItemId(KeyConstants.ARMOR_ATTACHMENT_KEY, itemJson)); // Add the ID to our array.

							if (!mainShopSiteJson.fieldsWithItems.includes("armorAttachmentItems")) {
								mainShopSiteJson.fieldsWithItems.push("armorAttachmentItems");
							}
						}
						else if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.WEAPON_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);
							mainShopSiteJson.weaponItems.push(await getItemId(KeyConstants.WEAPON_KEY, itemJson)); // Add the ID to our array.

							if (!mainShopSiteJson.fieldsWithItems.includes("weaponItems")) {
								mainShopSiteJson.fieldsWithItems.push("weaponItems");
							}
						}
						else if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.VEHICLE_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);
							mainShopSiteJson.vehicleItems.push(await getItemId(KeyConstants.VEHICLE_KEY, itemJson)); // Add the ID to our array.

							if (!mainShopSiteJson.fieldsWithItems.includes("vehicleItems")) {
								mainShopSiteJson.fieldsWithItems.push("vehicleItems");
							}
						}
						else if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.BODY_AND_AI_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);
							mainShopSiteJson.bodyAiItems.push(await getItemId(KeyConstants.BODY_AND_AI_KEY, itemJson)); // Add the ID to our array.

							if (!mainShopSiteJson.fieldsWithItems.includes("bodyAiItems")) {
								mainShopSiteJson.fieldsWithItems.push("bodyAiItems");
							}
						}
						else if (includedItemsArray[j].ItemType in CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS[KeyConstants.SPARTAN_ID_KEY]) {
							let itemJson = await getCustomizationItem(headers, includedItemsArray[j].ItemPath);

							try {
								let itemId = await getItemId(KeyConstants.SPARTAN_ID_KEY, itemJson); // We can't automatically add all Spartan ID items yet. This might not exist.
								if (!itemId) {
									itemId = await addSpartanIdItem(folderDict, headers, generalFolderDicts, spartanIdCategorySpecificFolderDicts, itemJson);
								}

								mainShopSiteJson.spartanIdItems.push(itemId);

								if (!mainShopSiteJson.fieldsWithItems.includes("spartanIdItems")) {
									mainShopSiteJson.fieldsWithItems.push("spartanIdItems");
								}
							}
							catch(error) {
								console.error("Error", error, "occurred when fetching Spartan ID item ID.", itemJson);
							}
						}
						else {
							console.warn("Discovered item with type " + includedItemsArray[j].ItemType + " that does not fit within an expected category.");
						}*/
					}

					let includedConsumablesArray = mainShopWaypointArray[i].IncludedCurrencies;

					for (let j = 0; j < includedConsumablesArray.length; ++j) {
						let consumableName = "";
						if (includedConsumablesArray[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_XP_BOOST_PATH_CONTENTS)) {
							consumableName = ConsumablesConstants.CONSUMABLES_XP_BOOST_NAME;
						}
						else if (includedConsumablesArray[j].CurrencyPath.includes(ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_PATH_CONTENTS)) {
							consumableName = ConsumablesConstants.CONSUMABLES_CHALLENGE_SWAP_NAME;
						}

						let consumableId = await wixData.query(ConsumablesConstants.CONSUMABLES_DB)
							.eq(ConsumablesConstants.CONSUMABLES_NAME_FIELD, consumableName)
							.find()
							.then((results) => {
								if (results.items.length > 0) {
									return results.items[0]._id;
								}
								else {
									throw "No Consumables returned from DB for name " + consumableName;
								}
							});

						mainShopSiteJson[ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD].push(consumableId);
						if (!mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].includes(ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD)) {
							mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].push(ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD);
						}
					}

					shopSiteArray.push(mainShopSiteJson);
					retry = false;
				}
				catch (error) {
					console.error("Try " + (++retryCount) + " of " + maxRetries + ". Failed to add ", mainShopWaypointArray[i], " due to error ", error);
					await sleep(2000);

					if (retryCount >= maxRetries) {
						throw "Exceeded max retry attempts while trying to add " + mainShopWaypointArray[i].OfferingId;
					}
				}
			}
		}
	}

	console.log("After execution: ", shopSiteArray);
	return shopSiteArray;
}

// We store item IDs in an array, which lets us query for items matching those IDs and then update them to 
export async function updateItemsCurrentlyAvailableStatus(customizationCategory, itemIdArray, currentlyAvailableStatus) {

	if (itemIdArray.length <= 0) {
		console.log("No processing necessary as itemIdArray is empty for " + customizationCategory);
		return [];
	}

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let itemInfoArray = []; // An array of URLs pointing to each item in the array.

	//console.log(customizationCategory, CUSTOMIZATION_CATEGORY_SPECIFIC_VARS);
	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	const SOCKET_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
	const CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;
	const NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField;
	const URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_URL_FIELDS[customizationCategory];

	const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;

	await wixData.query(CUSTOMIZATION_DB)
		.hasSome("_id", itemIdArray)
		.include()
		.find()
		.then(async (results) => {
			if (results.items.length > 0) {
				let items = results.items;
				let itemsToUpdate = []; // We're only going to add items that need to be changed to this array.

				for (let i = 0; i < items.length; ++i) {
					let item = items[i];
					if (item[CURRENTLY_AVAILABLE_FIELD] != currentlyAvailableStatus) {
						item[CURRENTLY_AVAILABLE_FIELD] = currentlyAvailableStatus;
						itemsToUpdate.push(item);
					}
					let itemType;
					if (!CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) { // If this isn't an attachment.
						itemType = item[SOCKET_REFERENCE_FIELD][SOCKET_NAME_FIELD];
					}
					else {
						itemType = "Helmet Attachment"; // TODO: Fix this if more attachment types are added.
					}

					itemInfoArray.push({
						itemName: item[NAME_FIELD],
						itemUrl: GeneralConstants.INFINITE_NEWS_URL_BASE + item[URL_FIELD],
						itemType: itemType
					});
				}

				console.log("Given these items", items, "Only updating these items", itemsToUpdate, "Marking currentlyAvailable as " + currentlyAvailableStatus);

				wixData.bulkUpdate(CUSTOMIZATION_DB, itemsToUpdate, options)
					.then((results) => {
						console.log("Results following update of currentlyAvailable for category", customizationCategory, "and item array", itemsToUpdate, ":", results);
					});
			}
		})
		.catch((error) => {
			console.error("Error", error, "occurred while marking items as no longer available for category", customizationCategory, "and ID array", itemIdArray);
		});
	
	return itemInfoArray;
}

// Accepts a site JSON file and marks all currentlyAvailable flags on the associated items as false within the DBs.
export async function updateBundleAndItemsCurrentlyAvailableStatus(itemJson, currentlyAvailableStatus, itemDb=ShopConstants.SHOP_DB) {

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let currentlyAvailableField = "";
	let fieldsWithItemsField = "";
	let consumableReferenceField = "";
	let referenceFieldToCategoryDict = {};

	if (itemDb == ShopConstants.SHOP_DB) {
		currentlyAvailableField = ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD;
		fieldsWithItemsField = ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD;
		consumableReferenceField = ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD;
		referenceFieldToCategoryDict = CustomizationConstants.SHOP_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT;
	}
	else if (itemDb == CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB) {
		currentlyAvailableField = CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD;
		fieldsWithItemsField = CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD;
		consumableReferenceField = "N/A"; // We don't support consumables in Capstone Challenges ATM.
		referenceFieldToCategoryDict = CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT;
	}
	else {
		throw "Unable to run updateBundleAndItemsCurrentlyAvailableStatus with itemDb " + itemDb + ". Exiting...";
    }

	let itemJsonCopy = structuredClone(itemJson);

	itemJson[currentlyAvailableField] = currentlyAvailableStatus;

	let itemInfoArray = [];

	// Update the items linked to the Shop Listing or Ultimate Challenge.
	for (let i = 0; i < itemJson[fieldsWithItemsField].length; ++i) {
		let currentField = itemJson[fieldsWithItemsField][i];
		//console.log(currentField);
		if (currentField == consumableReferenceField) {
			continue; // We do not want to process consumables in the same way as other items.
		}
		itemInfoArray = itemInfoArray.concat(await updateItemsCurrentlyAvailableStatus(
			referenceFieldToCategoryDict,
			itemJson[currentField],
			currentlyAvailableStatus
		));
	}

	wixData.update(itemDb, itemJson, options)
		.then((results) => {
			console.log("Results following update of currentlyAvailable for item:", itemJson, ":", results);

			// We only really need to add these if currentlyAvailableStatus is true, since this indicates the item has been added or updated.

			// Add the items to the Shop Bundle. We want to ensure the bundle has returned first.
			if (itemDb == ShopConstants.SHOP_DB && currentlyAvailableStatus) {
				for (const FIELD in referenceFieldToCategoryDict) {
					addItemIdArrayToShopItem(
						itemJson._id,
						FIELD,
						itemJsonCopy[FIELD],
						referenceFieldToCategoryDict[FIELD],
						itemJsonCopy[ShopConstants.SHOP_ITEM_NAME_FIELD],
						itemJsonCopy[ShopConstants.SHOP_COST_CREDITS_FIELD],
						itemJsonCopy[ShopConstants.SHOP_IS_HCS_FIELD]
					);
                }
				/*addItemIdArrayToShopItem(itemJson._id, "armorItems", itemJsonCopy.armorItems, KeyConstants.ARMOR_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "armorAttachmentItems", itemJsonCopy.armorAttachmentItems, KeyConstants.ARMOR_ATTACHMENT_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "weaponItems", itemJsonCopy.weaponItems, KeyConstants.WEAPON_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "vehicleItems", itemJsonCopy.vehicleItems, KeyConstants.VEHICLE_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "bodyAiItems", itemJsonCopy.bodyAiItems, KeyConstants.BODY_AND_AI_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "spartanIdItems", itemJsonCopy.spartanIdItems, KeyConstants.SPARTAN_ID_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);
				addItemIdArrayToShopItem(itemJson._id, "consumables", itemJsonCopy.consumables, KeyConstants.CONSUMABLES_KEY, itemJsonCopy.itemName, itemJsonCopy.costCredits, itemJsonCopy.isHcs);*/
			}
			// Add the item(s) to the Ultimate Challenge.
			else if (itemDb == CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB && currentlyAvailableStatus) {
				for (const FIELD in referenceFieldToCategoryDict) {
					WaypointFunctions.addItemIdArrayToCapstoneChallenge(
						itemJson._id,
						FIELD,
						itemJsonCopy[FIELD],
						referenceFieldToCategoryDict[FIELD],
						itemJsonCopy[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD]
					);
				}
				/*WaypointFunctions.addItemIdArrayToCapstoneChallenge(itemJson._id, "armorItems", itemJsonCopy.armorItems, KeyConstants.ARMOR_KEY, itemJsonCopy.title);
				Waypoint.addItemIdArrayToCapstoneChallenge(itemJson._id, "armorAttachmentItems", itemJsonCopy.armorAttachmentItems, KeyConstants.ARMOR_ATTACHMENT_KEY, itemJsonCopy.title);
				Waypoint.addItemIdArrayToCapstoneChallenge(itemJson._id, "weaponItems", itemJsonCopy.weaponItems, KeyConstants.WEAPON_KEY, itemJsonCopy.title);
				Waypoint.addItemIdArrayToCapstoneChallenge(itemJson._id, "vehicleItems", itemJsonCopy.vehicleItems, KeyConstants.VEHICLE_KEY, itemJsonCopy.title);
				Waypoint.addItemIdArrayToCapstoneChallenge(itemJson._id, "bodyAiItems", itemJsonCopy.bodyAiItems, KeyConstants.BODY_AND_AI_KEY, itemJsonCopy.title);
				Waypoint.addItemIdArrayToCapstoneChallenge(itemJson._id, "spartanIdItems", itemJsonCopy.spartanIdItems, KeyConstants.SPARTAN_ID_KEY, itemJsonCopy.title);*/
			}
		})
		.catch((error) => {
			console.error("Error", error, "occurred while updating item availability", itemJson);
		});
	
	return itemInfoArray;
}

// We store item IDs in an array, which lets us query for items matching those IDs and then update them.
export async function addItemIdArrayToShopItem(bundleId, fieldName, itemIdArray, customizationCategory, bundleName, bundleCost, isHcs) {
	const PENDING_SOURCE_ID = CustomizationConstants.SOURCE_TYPE_PENDING_ID;
	const SHOP_SOURCE_ID = CustomizationConstants.SOURCE_TYPE_SHOP_ID;

	if (itemIdArray.length <= 0) {
		console.log("No processing necessary as itemIdArray is empty for " + customizationCategory + " and Shop Bundle Name " + bundleName);
		return;
	}

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	wixData.replaceReferences(ShopConstants.SHOP_DB, fieldName, bundleId, itemIdArray, options)
		.then(() => {
			//console.log("Added references for Shop item ", bundleId, " and fieldName ", fieldName);
		})
		.catch((error) => {
			console.error("Error", error, "occurred. Failed to add references for Shop item ", bundleId, " and fieldName ", fieldName);
		});

	// We have three tasks for each item ID: update the source (if it is (Pending) or Pending), update the sourcetype reference, and mark it currently Available.
	// Consumables need to be done manually due to the lack of a single source for them.
	if (fieldName != ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD) {
		const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
		const CUSTOMIZATION_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceField;
		const CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;
		const CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;

		wixData.query(CUSTOMIZATION_DB)
			.hasSome("_id", itemIdArray)
			.include(CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)
			.find()
			.then((results) => {
				if (results.items.length > 0) {
					let items = results.items;
					let itemsToUpdate = []; // We only update items that need to be changed.
					items.forEach((item) => {
						let itemChanged = false;
						if (!item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD]) {
							item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] = true;
							itemChanged = true;
						}

						// We need to update the source
						if (item[CUSTOMIZATION_SOURCE_FIELD].includes("Pending")) {
							let sourceText = "Purchase <i>" + bundleName + "</i> from the " + ((isHcs) ? "HCS " : "") + "Shop for " + bundleCost + " Credits";
							item[CUSTOMIZATION_SOURCE_FIELD] = sourceText;
							itemChanged = true;
						}

						if (itemChanged) {
							// Add the item to the list of items to change.
							itemsToUpdate.push(item);
						}

						// We only want to add a source type reference if it isn't already there. It won't hurt if it is, but it will change the Updated Datetime of the item.
						let sourceTypeReferenceIncludesDesiredId = false;

						for (let i = 0; i < item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD].length; ++i) {
							if (item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD][i]._id == SHOP_SOURCE_ID) {
								sourceTypeReferenceIncludesDesiredId = true;
								break;
							}
						}

						// We also need to update or replace the sourcetype. Thankfully, we included this field.
						if (item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD].length == 1 && item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD][0]._id == PENDING_SOURCE_ID) {
							// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
							wixData.replaceReferences(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [SHOP_SOURCE_ID])
								.then (() => {
									console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
								})
								.catch((error) => {
									console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
								});
						}
						else if (!sourceTypeReferenceIncludesDesiredId) {
							// We just want to insert the source type in this case.
							wixData.insertReference(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [SHOP_SOURCE_ID])
								.then (() => {
									console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
								})
								.catch((error) => {
									console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
								});
						}
					});

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
	}
}

async function addBundleToDb(shopBundleJson) {
	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let shopBundleJsonCopy = structuredClone(shopBundleJson); // This ensures that insertions don't throw out our multi-references.

	console.log("Adding Shop Bundle " + shopBundleJson[ShopConstants.SHOP_ITEM_NAME_FIELD]);

	let addedBundle = await wixData.insert(ShopConstants.SHOP_DB, shopBundleJsonCopy, options) // This needs to await since we need the URL from the bundle for Twitter API stuff.
		.then((results) => {
			console.log("Inserted this bundle to the Shop DB: ", results);

			// This might no longer be necessary due to structuredClone().
			/*let temp = new Date(results.lastAvailableDatetime);
			results.lastAvailableDatetime = temp;

			wixData.update(KeyConstants.SHOP_DB, results, options)
				.catch((error) => {
					console.error("Failed to add datetime for this item", results, "due to error", error);
				});
				*/

			return results;
		})
		.catch((error) => {
			console.error("Error", error, "occurred while attempting to add this Bundle to DB:", shopBundleJsonCopy);
		});

	for (const FIELD in CustomizationConstants.SHOP_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT) {
		addItemIdArrayToShopItem(
			addedBundle._id,
			FIELD,
			shopBundleJson[FIELD],
			referenceFieldToCategoryDict[FIELD],
			shopBundleJson[ShopConstants.SHOP_ITEM_NAME_FIELD],
			shopBundleJson[ShopConstants.SHOP_COST_CREDITS_FIELD],
			shopBundleJson[ShopConstants.SHOP_IS_HCS_FIELD]
		);
	}

	/*
	addItemIdArrayToShopItem(addedBundle._id, "armorItems", shopBundleJson.armorItems, KeyConstants.ARMOR_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "armorAttachmentItems", shopBundleJson.armorAttachmentItems, KeyConstants.ARMOR_ATTACHMENT_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "weaponItems", shopBundleJson.weaponItems, KeyConstants.WEAPON_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "vehicleItems", shopBundleJson.vehicleItems, KeyConstants.VEHICLE_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "bodyAiItems", shopBundleJson.bodyAiItems, KeyConstants.BODY_AND_AI_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "spartanIdItems", shopBundleJson.spartanIdItems, KeyConstants.SPARTAN_ID_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	addItemIdArrayToShopItem(addedBundle._id, "consumables", shopBundleJson.consumables, KeyConstants.CONSUMABLES_KEY, shopBundleJson.itemName, shopBundleJson.costCredits, shopBundleJson.isHcs);
	*/

	return addedBundle;
}

// This function generates the Twitter and Discord notifications
export async function generateSocialNotifications(updateItemArray) {

	// First, we count how many of each type of bundle has newly appeared.
	let numReturningWeeklyBundles = 0;
	let numNewWeeklyBundles = 0;
	let numReturningDailyBundles = 0;
	let numNewDailyBundles = 0;
	let numReturningHcsBundles = 0;
	let numNewHcsBundles = 0;
	let numReturningIndefiniteBundles = 0;
	let numNewIndefiniteBundles = 0;

	for (let i = 0; i < updateItemArray.length; ++i) {

		console.log("Checking to see if this item is new/returning and daily/weekly.", updateItemArray[i]);
		let lastAvailableDatetime = new Date(updateItemArray[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
		if (new Date(lastAvailableDatetime.toDateString()) < new Date(new Date().toDateString())) { // If the lastAvailableDatetime is before today, the item is returning.
			if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_DAILY)) {
				updateItemArray[i].returning = true;
				numReturningDailyBundles++;
			}
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_WEEKLY)) {
				updateItemArray[i].returning = true;
				numReturningWeeklyBundles++;
			}
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_INDEFINITE) &&
				updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {

				updateItemArray[i].returning = true;
				numReturningHcsBundles++;
			}
			else {
				updateItemArray[i].returning = true;
				numReturningIndefiniteBundles++;
			}
		}
		else {
			if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_DAILY)) {
				updateItemArray[i].returning = false;
				numNewDailyBundles++;
			}
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_WEEKLY)) {
				updateItemArray[i].returning = false;
				numNewWeeklyBundles++;
			}
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_INDEFINITE) &&
				updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {

				updateItemArray[i].returning = false;
				numNewHcsBundles++;
			}
			else {
				updateItemArray[i].returning = false;
				numNewIndefiniteBundles++;
			}
		}
	}

	// Then, we format each count and add it to an array that will then be formatted into the final Tweet structure.
	let bundleSummaryArray = []; // Entries in this array will be of the form "[num] [returning/new] [Weekly/Daily/Indefinite] Bundles"
	let hcsBundleSummaryArray = []; // HCS Bundles might get replaced in bulk, so it's best to put these in a separate tweet.

	if (numReturningWeeklyBundles > 0) {
		if (numReturningWeeklyBundles == 1) {
			bundleSummaryArray.push(numReturningWeeklyBundles + " returning Weekly Listing");
		}
		else {
			bundleSummaryArray.push(numReturningWeeklyBundles + " returning Weekly Listings");
		}
	}
	if (numReturningDailyBundles > 0) {
		if (numReturningDailyBundles == 1) {
			bundleSummaryArray.push(numReturningDailyBundles + " returning Daily Listing");
		}
		else {
			bundleSummaryArray.push(numReturningDailyBundles + " returning Daily Listings");
		}
	}
	if (numReturningHcsBundles > 0) {
		if (numReturningHcsBundles == 1) {
			hcsBundleSummaryArray.push(numReturningHcsBundles + " returning HCS Listing");
		}
		else {
			hcsBundleSummaryArray.push(numReturningHcsBundles + " returning HCS Listings");
		}
	}
	if (numReturningIndefiniteBundles > 0) {
		if (numReturningIndefiniteBundles == 1) {
			bundleSummaryArray.push(numReturningIndefiniteBundles + " returning Indefinite Listing");
		}
		else {
			bundleSummaryArray.push(numReturningIndefiniteBundles + " returning Indefinite Listings");
		}
	}
	if (numNewWeeklyBundles > 0) {
		if (numNewWeeklyBundles == 1) {
			bundleSummaryArray.push(numNewWeeklyBundles + " new Weekly Listing");
		}
		else {
			bundleSummaryArray.push(numNewWeeklyBundles + " new Weekly Listings");
		}
	}
	if (numNewDailyBundles > 0) {
		if (numNewDailyBundles == 1) {
			bundleSummaryArray.push(numNewDailyBundles + " new Daily Listing");
		}
		else {
			bundleSummaryArray.push(numNewDailyBundles + " new Daily Listings");
		}
	}
	if (numNewHcsBundles > 0) {
		if (numNewHcsBundles == 1) {
			hcsBundleSummaryArray.push(numNewHcsBundles + " new HCS Listing");
		}
		else {
			hcsBundleSummaryArray.push(numNewHcsBundles + " new HCS Listings");
		}
	}
	if (numNewIndefiniteBundles > 0) {
		if (numNewIndefiniteBundles == 1) {
			bundleSummaryArray.push(numNewIndefiniteBundles + " new Indefinite Listing");
		}
		else {
			bundleSummaryArray.push(numNewIndefiniteBundles + " new Indefinite Listings");
		}
	}

	let mainTweetText = "Today's #HaloInfinite Shop contains ";
	let hcsTweetText = "Today's #HaloInfinite HCS Shop contains ";

	for (let i = 0; i < bundleSummaryArray.length; ++i) {
		if (i < bundleSummaryArray.length - 1) { // If we aren't at the end of the list.
			mainTweetText += bundleSummaryArray[i] + ", ";
		}
		else {
			if (bundleSummaryArray.length > 1) {
				mainTweetText += "and ";
			}
			mainTweetText += bundleSummaryArray[i] + ".\n\n";
		}
	}

	for (let i = 0; i < hcsBundleSummaryArray.length; ++i) {
		if (i < bundleSummaryArray.length - 1) { // If we aren't at the end of the list.
			hcsTweetText += hcsBundleSummaryArray[i] + ", ";
		}
		else {
			if (hcsBundleSummaryArray.length > 1) {
				hcsTweetText += "and ";
			}
			hcsTweetText += hcsBundleSummaryArray[i] + ".\n\n";
		}
	}

	// Then, we need to assemble the lines summarizing each bundle/item.
	// These arrays will includes strings with one of two formats: " - [bundleName] ([creditCost] Credits)" or " - [bundleName] ([creditCost] Credits, last added [MM/DD/YYYY])"
	let mainItemListingArray = []; 
	let mainItemArray = [];
	let hcsItemListingArray = [];
	let hcsItemArray = [];

	for (let i = 0; i < updateItemArray.length; ++i) {
		if (updateItemArray[i].returning) {
			let lastAvailableDatetime = new Date(updateItemArray[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);

			/*
			var monthString = (lastAvailableDatetime.getMonth() + 1).toString();
			while (monthString.length < 2) {
				monthString = "0" + monthString;
			}

			var dateString = lastAvailableDatetime.getDate().toString();
			while (dateString.length < 2) {
				dateString = "0" + dateString;
			}

			var yearString = lastAvailableDatetime.getFullYear().toString();
			*/

			let dateString = GeneralFunctions.getLongMonthDayYearFromDate(lastAvailableDatetime);

			if (!updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {
				mainItemListingArray.push(" - " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits, last added " + dateString + ")");
				mainItemArray.push(updateItemArray[i]);
			}
			else {
				hcsItemListingArray.push(" - " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits, last added " + dateString + ")");
				hcsItemArray.push(updateItemArray[i]);
			}
		}
		else {
			if (!updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {
				mainItemListingArray.push(" - " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits)");
				mainItemArray.push(updateItemArray[i]);
			}
			else {
				hcsItemListingArray.push(" - " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits)");
				hcsItemArray.push(updateItemArray[i]);
			}
		}
	}

	let tweetTextArray = [mainTweetText];	// We'll print the contents of these arrays in order as individual Tweets.
	let hcsTweetTextArray = [hcsTweetText];

	let currentTweetIndex = 0;
	let currentHcsTweetIndex = 0;

	// Now to assemble the full tweets. Note that we might need additional tweets if we can't fit everything in the first one.
	for (let i = 0; i < mainItemListingArray.length; ++i) {
		if (tweetTextArray[currentTweetIndex].length + mainItemListingArray[i].length > 280) {
			// Move to the next Tweet if we can't send this one.
			++currentTweetIndex;
			tweetTextArray.push(mainItemListingArray[i] + "\n");
		}
		else {
			tweetTextArray[currentTweetIndex] += mainItemListingArray[i] + "\n";
		}
	}

	for (let i = 0; i < hcsItemListingArray.length; ++i) {
		if (hcsTweetTextArray[currentHcsTweetIndex].length + hcsItemListingArray[i].length > 280) {
			// Move to the next Tweet if we can't send this one.
			++currentHcsTweetIndex;
			hcsTweetTextArray.push(hcsItemListingArray[i] + "\n");
		}
		else {
			hcsTweetTextArray[currentHcsTweetIndex] += mainItemListingArray[i] + "\n";
		}
	}

	if (mainItemListingArray.length > 0) {
		console.log(tweetTextArray[0]);
		let parentId = await sendTweet(tweetTextArray[0]);
		for (let i = 1; i < tweetTextArray.length; ++i) {
			console.log(tweetTextArray[i]);
			parentId = await sendTweet(tweetTextArray[i], parentId);
		}

		let discordMessageText = "";
		tweetTextArray.forEach((tweet) => {
			discordMessageText += tweet + "\n";
		});

		await sendDiscordMessage("shop", discordMessageText, true); // Include notification in the message.

		for (let i = 0; i < mainItemArray.length; ++i) {
			let subTweetText = "Full details for the " + mainItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " " + mainItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD][0] +
				" Listing (" + mainItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] + " Credits) are available here.\n\n";

			subTweetText += GeneralConstants.INFINITE_NEWS_URL_BASE + mainItemArray[i][ShopConstants.SHOP_URL_FIELD];
			console.log(subTweetText);
			parentId = await sendTweet(subTweetText, parentId);
			await sendDiscordMessage("shop", subTweetText);
		}
	}

	if (hcsItemListingArray.length > 0) {
		console.log(hcsTweetTextArray[0]);
		let parentId = await sendTweet(hcsTweetTextArray[0]);
		for (let i = 1; i < hcsTweetTextArray.length; ++i) {
			console.log(hcsTweetTextArray[i]);
			parentId = await sendTweet(hcsTweetTextArray[i], parentId);
		}

		let discordMessageText = "";
		hcsTweetTextArray.forEach((tweet) => {
			discordMessageText += tweet + "\n";
		});

		await sendDiscordMessage("shop", discordMessageText, true); // Include notification in the message.

		for (let i = 0; i < hcsItemArray.length; ++i) {
			let subTweetText = "Full details for the " + hcsItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " HCS Listing (" +
				hcsItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] + " Credits) are available here.\n\n";

			subTweetText += GeneralConstants.INFINITE_NEWS_URL_BASE + hcsItemArray[i][ShopConstants.SHOP_URL_FIELD];
			console.log(subTweetText);
			parentId = await sendTweet(subTweetText, parentId);
			await sendDiscordMessage("shop", subTweetText);
		}
		/*
		console.log(hcsTweetText);
		let parentId = await sendTweet(hcsTweetText);
		await sendDiscordMessage("shop", hcsTweetText, true);
		if (secondHcsTweetText.length > 0) {
			console.log(secondHcsTweetText)
			parentId = await sendTweet(secondHcsTweetText, parentId);
			await sendDiscordMessage("shop", secondHcsTweetText, true);
		}

		for (let i = 0; i < hcsItemArray.length; ++i) {
			let subTweetText = "Full details for the " + hcsItemArray[i].itemName + " HCS Listing (" + hcsItemArray[i].costCredits + " Credits) are available here.\n\n";
			subTweetText += "https://www.haloinfinitenews.com" + hcsItemArray[i]["link-shop-listings-itemName"];
			console.log(subTweetText);
			parentId = await sendTweet(subTweetText, parentId);
			await sendDiscordMessage("shop", subTweetText);
		}
		*/
	}
}

export async function sendPushNotification(title, body, subtitle, url, destinationSegment = "Shop Listings") {
	const appId = await getSecret("OneSignalAppId");
	const apiKey = await getSecret("OneSignalApiKey");
	const OneSignal = require('onesignal-node');
	const client = new OneSignal.Client(appId, apiKey);

	// See all fields: https://documentation.onesignal.com/reference/create-notification
	const notification = {
		headings: {
			"en": title
		},
		subtitle: {
			"en": subtitle
		},
		contents: {
			'en': body,
		},
		url: url,
		included_segments: [destinationSegment],
	};

	client.createNotification(notification)
		.then(response => {
			console.log("Notification response for notification: ", notification, ":", response);
		})
		.catch(e => {
			console.error(e);
		});
}

export async function generatePushNotifications(updateItemArray) {
	if (updateItemArray.length > 1) {
		let title = "New Shop Listings Available!";
		let subtitle = "";
		let body = "Click here to view all the new Shop Listings";
		let url = GeneralConstants.INFINITE_NEWS_URL_BASE + ShopConstants.SHOP_LISTINGS_URL_SUFFIX;

		sendPushNotification(title, body, subtitle, url);
		return;
	}

	for (let i = 0; i < updateItemArray.length; ++i) {
		// We'll make notifications in the following form:
		/*
			title: "[itemName]",
			body: "New Bundle available! Click here to view it.",
			subtitle: "[costCredits] Credits",
			url: "https://www.haloinfinitenews.com" + [link-shop-listings-itemName]
		*/

		sendPushNotification(updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD],
			"New Halo Infinite Shop Listing available now for " + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] + " Credits! Click here to view it.",
			updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD][0] + " Listing",
			GeneralConstants.INFINITE_NEWS_URL_BASE + updateItemArray[i][ShopConstants.SHOP_URL_FIELD]);
	}
}

// This function will be called by the job scheduler.
export async function refreshShop() {
	let currentlyAvailableShopListings = await getCurrentlyAvailableShopListings();
	let newlyAvailableShopListings = await getConvertedShopList();

	if (newlyAvailableShopListings.length <= 0) {
		throw "Error: No new Shop Listings were returned. Exiting now to avoid notification spam.";
	}

	// The bundles should always have unique waypoint IDs so we can just check to see if each currently available item is in the newlyAvailable list.
	// If not, we mark it as not currently available.
	let newlyAvailableShopListingIds = []; 
	let currentlyAvailableShopListingIds = []; // We need this array so that we can check each newly available listing and see if we already have it available.

	for (let i = 0; i < newlyAvailableShopListings.length; ++i) {
		newlyAvailableShopListingIds.push(newlyAvailableShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
	}

	for (let i = 0; i < currentlyAvailableShopListings.length; ++i) {
		currentlyAvailableShopListingIds.push(currentlyAvailableShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
	}

	for (let i = 0; i < currentlyAvailableShopListings.length; ++i) {
		if (!newlyAvailableShopListingIds.includes(currentlyAvailableShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD])) {
			updateBundleAndItemsCurrentlyAvailableStatus(currentlyAvailableShopListings[i], false); // This doesn't need to be done synchronously thankfully.
		}
	}

	let newShopListingsToUpdate = [];

	for (let i = 0; i < newlyAvailableShopListings.length; ++i) {
		if (!currentlyAvailableShopListingIds.includes(newlyAvailableShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD])) {
			// If there's a listing not in the previously available array, we need to update it or add it and report that it's new.
			newShopListingsToUpdate.push(newlyAvailableShopListings[i]);
		}			
	}

	if (newlyAvailableShopListingIds.length > 0) {
		/*let dbQuery = wixData.query(ShopConstants.SHOP_DB).eq("waypointId", newlyAvailableShopListingIds[0]);
		for (let i = 1; i < newlyAvailableShopListingIds.length; ++i) {
			dbQuery = dbQuery.or(wixData.query(KeyConstants.SHOP_DB).eq("waypointId", newlyAvailableShopListingIds[i]));
		}*/

		// Now that we've got the old bundles being marked as no longer available, we need to mark the new bundles as currently available when they exist and add them when they don't.
		wixData.query(ShopConstants.SHOP_DB)
			.hasSome(ShopConstants.SHOP_WAYPOINT_ID_FIELD, newlyAvailableShopListingIds)
			.find()
			.then(async (results) => {
				let items = results.items;
				console.log("Items returned: ", items);
				let itemIds = [];
				
				for (let i = 0; i < items.length; i++) {
					itemIds.push(items[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
				}

				let updateItemArray = [];

				console.log("Arrays to process:", itemIds, newShopListingsToUpdate);

				for(let i = 0; i < newShopListingsToUpdate.length; ++i) { // We're assuming everything else has been marked correctly. Big assumption, yes, but potentially more efficient.
					let item;
					let itemIndex = itemIds.findIndex((itemId) => { return newShopListingsToUpdate[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD] == itemId; });
					console.log("Item index is ", itemIndex, "for item ID", newShopListingsToUpdate[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);

					if (itemIndex > -1) { // If the item was found.
						item = items[itemIndex];
						newShopListingsToUpdate[i]._id = item._id; // The DB ID ties both items together, so we need to transfer it.

						// If these arrays exist, we grab them to add onto them. Otherwise, we create it from scratch.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = item[ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] || [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = item[ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] || [];

						// We have to add this here because we need the existing array of datetimes.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]); 
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);

						console.log("Last added datetime for ", item[ShopConstants.SHOP_WAYPOINT_ID_FIELD], " is ", item[ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						console.log(newShopListingsToUpdate[i]);
						updateBundleAndItemsCurrentlyAvailableStatus(newShopListingsToUpdate[i], true);

						// We need to ensure that the name, cost, and bundle type are updated and passed to the Twitter and Push Notification functions.
						item[ShopConstants.SHOP_ITEM_NAME_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_ITEM_NAME_FIELD];
						item[ShopConstants.SHOP_COST_CREDITS_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD];
						item[ShopConstants.SHOP_TIME_TYPE_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_TIME_TYPE_FIELD];
					}
					else { // If we didn't find the item, we need to add it. This is a bit involved since we also have to add references for each of its multi-references.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);
						console.log(newShopListingsToUpdate[i]);

						item = await addBundleToDb(newShopListingsToUpdate[i]); // We need to await this if we want to integrate with the Twitter API.
					}

					updateItemArray.push(item);
				}
				
				console.log("Update item array:", updateItemArray);

				generateSocialNotifications(updateItemArray);

				generatePushNotifications(updateItemArray);
			});
	}
}