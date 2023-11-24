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

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

// Import helper functions.
import * as ApiFunctions from 'backend/ApiFunctions.jsw';
import * as MediaManagerFunctions from 'backend/MediaManagerFunctions.jsw';

import {sendTweet} from 'backend/TwitterApiFunctions.jsw';
import {sendDiscordMessage} from 'backend/DiscordBotFunctions.jsw';
import * as WaypointFunctions from 'backend/WaypointBackendFunctions.jsw';
import * as GeneralFunctions from 'public/General.js';
import * as GeneralBackendFunctions from 'backend/GeneralBackendFunctions.jsw';
import * as NotificationFunctions from 'backend/NotificationFunctions.jsw';
import * as InternalNotifications from 'backend/InternalNotificationFunctions.jsw';

const CUSTOMIZATION_SHOP_LIMIT = 40;
let resetOffset = false;

// Gets a list of all currently available shop items, including the items contained within bundles.
export async function getCurrentlyAvailableShopListings(getCustomizationShopListings = false) {
	let retry = true;
	let retryCount = 0;
	const MAX_RETRIES = 10;

	let currentlyAvailableShopListings = [];

	let currentlyAvailableField = (getCustomizationShopListings) ? ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD : ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD;

	while (retry && retryCount < MAX_RETRIES) {
		currentlyAvailableShopListings = await wixData.query(ShopConstants.SHOP_DB)
			.eq(currentlyAvailableField, true)
			.limit(1000)
			.find()
			.then((results) => {
				retry = false;
				return results.items;
			})
			.catch ((error) => {
				console.error("Error occurred while retrieving currently available shop listings from DB. Attempt " + (++retryCount) + " of " + MAX_RETRIES + ": " + error);

				if (retryCount >= MAX_RETRIES) {
					throw "Unable to retrieve currently available shop listings after " + MAX_RETRIES + " attempts. Exiting Shop import...";
				}

				return [];
			});
	}

	if (getCustomizationShopListings) {
		let idArray = [];
		for (let i = 0; i < currentlyAvailableShopListings.length; ++i) {
			idArray.push(currentlyAvailableShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
		}

		console.log("Currently Available Customization Shop Listing IDs:", idArray);

		return idArray;
	}

	
	// We need to get the multi-references for each shop listing; namely, the items each listing includes.
	for (let i = 0; i < currentlyAvailableShopListings.length; ++i) {
		// We can actually improve the performance by only querying the fields with items.
		for (let j = 0; j < currentlyAvailableShopListings[i][ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].length; ++j) {
			let itemField = currentlyAvailableShopListings[i][ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD][j];

			retry = true;
			retryCount = 0;
			while (retry && retryCount < MAX_RETRIES) {
				currentlyAvailableShopListings[i][itemField] = await wixData.queryReferenced(ShopConstants.SHOP_DB, currentlyAvailableShopListings[i]._id, itemField)
					.then((results) => {
						let idArray = [];
						results.items.forEach((item) => {
							idArray.push(item._id);
						});
						retry = false;
						return idArray;
					})
					.catch((error) => {
						console.error("Error occurred while retrieving " + itemField + " data for currently available shop listing " + currentlyAvailableShopListings[i]._id + " from DB. Attempt " + 
							(++retryCount) + " of " + MAX_RETRIES + ": " + error);

						if (retryCount >= MAX_RETRIES) {
							throw "Unable to retrieve " + itemField + " data for currently available shop listing " + currentlyAvailableShopListings[i]._id + " after " + 
								MAX_RETRIES + " attempts. Exiting Shop import...";
						}

						return [];
					});
			}
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

	let remakeHeaders = false;

	while (retry) {
		if (remakeHeaders) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await ApiFunctions.getSpartanToken();
			let clearance = await ApiFunctions.getClearance();

			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}

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
					return { "Offerings" : [] };
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return { "Offerings" : [] };
			});

		remakeHeaders = retry; // If we retry, remake the headers first.
	}

	/*let refinedOfferings = [];

	for (let i = 0; i < waypointJson.Offerings.length; ++i) {
		if (waypointJson.Offerings[i].OfferingId === "20230428-01" || waypointJson.Offerings[i].OfferingId === "20230517-00") {
			continue;
		}

		refinedOfferings.push(waypointJson.Offerings[i]);
	}

	waypointJson.Offerings = refinedOfferings;*/

	if (waypointJson.Offerings.length <= 0) {
		throw "No offerings returned for HCS Shop; aborting to avoid data poisoning.";
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

	let remakeHeaders = false;

	while (retry) {
		if (remakeHeaders) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await ApiFunctions.getSpartanToken();
			let clearance = await ApiFunctions.getClearance();

			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}

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
					return { "Offerings" : [] };
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return { "Offerings" : [] };
			});

		remakeHeaders = retry;
	}

	/*let refinedOfferings = [];

	for (let i = 0; i < waypointJson.Offerings.length; ++i) {
		if (waypointJson.Offerings[i].OfferingId === "20230210-02" || waypointJson.Offerings[i].OfferingId === "20230210-01") {
			continue;
		}

		refinedOfferings.push(waypointJson.Offerings[i]);
	}

	waypointJson.Offerings = refinedOfferings;*/

	if (waypointJson.Offerings.length <= 0) {
		throw "No offerings returned for HCS Shop; aborting to avoid data poisoning.";
	}

	return waypointJson;
}

// Gets list of Customization Offers Shop items from Waypoint.
export async function getCustomizationOffersShopListFromWaypoint(headers) {
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

		let retry = true;
	let waypointJson = {};

	let url = ApiConstants.WAYPOINT_URL_BASE_ECONOMY + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_ECONOMY_STORE_CUSTOMIZATION_OFFERS;

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
			let spartanToken = await ApiFunctions.getSpartanToken();
			let clearance = await ApiFunctions.getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}

	let currentOffsetObject = await wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_SHOP_OFFSET_KEY)
		.find()
		.then((results) => {
			if (results.items.length == 0) {
				throw "Offset not found in Key Value DB. Throwing error.";
			}
			else {
				return results.items[0];
			}
		})
		.catch((error) => {
			console.error("Error occurred when determining offset. Throwing", error);
			throw "Dying because unable to retrieve offset from Key Value DB.";
		});

	resetOffset = waypointJson.Offerings.length <= currentOffsetObject.value.offset + CUSTOMIZATION_SHOP_LIMIT; // Check if we need to reset the offset at the end.

	return waypointJson.Offerings.slice(currentOffsetObject.value.offset, currentOffsetObject.value.offset + CUSTOMIZATION_SHOP_LIMIT);
}

// Retrieves an item ID based on the JSON returned from Waypoint and some other efficiency arguments.
export async function getItemId(customizationCategory, waypointId, possibleMultiCore = false, exactWaypointId = "") { // If the item might be multi-core, we can check any match to see if crossCompatible is set.
	// If the item could be multi-core, we need to set the exact waypoint ID so we can find it as a backup when the item isn't multi-core.
	// It's time to select the item!
	let existingItem = {};

	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;
	const CROSS_COMPATIBLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCrossCompatibleField;

	let multipleItems = [];

	await wixData.query(CUSTOMIZATION_DB)
		.contains(WAYPOINT_ID_FIELD, waypointId) // This is so we don't have any issues with case.
		.find()
		.then((results) => {
			if (results.items.length == 1) { // This is the expected case for now. If cross-core occurs in the future, this will affect some things.
				existingItem = results.items[0];
			}
			else if (results.items.length > 1) { 
				if (!possibleMultiCore) {
					throw "Multiple items returned despite assumed uniqueness. Tried querying based on " + waypointId;
				}
				else if (results.items[0][CROSS_COMPATIBLE_FIELD]) {
					for (let i = 0; i < results.items.length; ++i) {
						multipleItems.push(results.items[i]._id);
					}
				}
				else {
					// This isn't a multi-core coating, so we need to only include the coatings specified in the bundle/challenge/etc.
					existingItem = null;

					for (let i = 0; i < results.items.length; ++i) {
						if (results.items[i][WAYPOINT_ID_FIELD] == exactWaypointId) {
							existingItem = results.items[i];
							break;
						}
					}
				}
			}
			else {
				existingItem = null;
			}
		});

	if (existingItem && !possibleMultiCore) {
		return existingItem._id; // Only one match to be found.
	}
	else if (multipleItems.length > 0 && possibleMultiCore) {
		return multipleItems; // Multiple matches were found and desired.
	}
	else if (existingItem && possibleMultiCore) {
		return [existingItem._id]; // Multiple matches were desired, but only one was found.
	}
	else {
		throw "Error retrieving DB ID for waypoint ID " + waypointId + " from " + CUSTOMIZATION_DB;
	}
}

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
export async function getConvertedShopList(processCustomizationOptions = false) {
	let headers = await ApiFunctions.makeWaypointHeaders();

	let typeDict = await GeneralBackendFunctions.generateTypeDict();

	let normalShopWaypointJson = {};
	let hcsShopListWaypoint = {};

	if (!processCustomizationOptions) {
		normalShopWaypointJson = await getMainShopListFromWaypoint(headers);
		hcsShopListWaypoint = await getHcsShopListFromWaypoint(headers);
	}
	else {
		normalShopWaypointJson = await getCustomizationOffersShopListFromWaypoint(headers);
	}

	let shopSiteArray = [];

	console.log("Retrieving Shop-exclusive folderDict...");
	let folderDict;
	let results = await wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + CustomizationConstants.CUSTOMIZATION_CATEGORY_FOLDER_DICT[ShopConstants.SHOP_KEY] + "/")
		.find()
		.catch((error) => {
			console.error(error, "occurred while querying Key Value DB.");
			return {
				items: []
			};
		});

	if (results.items.length > 0) {
		folderDict = results.items[0].value;
	}
	else {
		throw "Could not retrieve folder dict. Cannot get customization image urls.";
	}

	console.log("Shop-exclusive Folder dict retrieved!");

	let qualityDict = {}; // The keys will be quality values (e.g. "Epic" or "Legendary"), and the values will be quality IDs. Let's us avoid querying the DB for every quality inquiry.

	console.log("Querying for quality data");
	let qualityResults = await wixData.query(CustomizationConstants.QUALITY_DB)
		.find()
		.catch((error) => {
			console.error(error, "occurred while filling in quality dict");
			return {
				items: []
			};
		});

	console.log("Quality data returned");

	if (qualityResults.items.length > 0) {
		console.log("Quality values found", qualityResults);
		for (let i = 0; i < qualityResults.items.length; ++i) {
			qualityDict[qualityResults.items[i].quality] = qualityResults.items[i]._id;
		}
	}
	else {
		throw "No quality values found in the DB! Major emergency!";
	}

	const maxRetries = 10;
	let maxIterations = ((processCustomizationOptions) ? 1 : 2); // We're just going to do the same stuff twice, first on the normal Shop, then on the HCS Shop. For the customization shop, we only do this once.

	console.log("Beginning to fill out shop listings from API...");

	for (let h = 0; h < maxIterations; h++) { 
		let mainShopWaypointJson = (h == 0) ? normalShopWaypointJson : hcsShopListWaypoint;
		let mainShopWaypointArray = (processCustomizationOptions) ? mainShopWaypointJson : mainShopWaypointJson.Offerings;

		for (let i = 0; i < mainShopWaypointArray.length; ++i) {

			let retryCount = 0;
			let retry = true;
			while (retry && retryCount < maxRetries) {
				try {
					console.log(mainShopWaypointArray[i].OfferingId);

					let mainShopSiteJson = {};
					let shopWaypointJson = await ApiFunctions.getCustomizationItem(headers, mainShopWaypointArray[i].OfferingDisplayPath);

					// Weekly bundles have excluded the Flair Text since Season 2. Let's parse empty Flair Text values as "Weekly".
					if (!processCustomizationOptions) {
						switch (shopWaypointJson.FlairText.toLowerCase()) {
							case "weekly":
							case "":
							case "best value":
							case "new":
							case "returning":
							case "sale":
							case "event":
							case "exclusive content!":
							case "exclusive content":
							case "timed exclusive":
							case "last chance":
								if (shopWaypointJson.Title.trim() === "Boost and Swap Pack") {
									mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_INDEFINITE]; // The Boost and Swap Pack is getting picked up by this.
								}
								else if (mainShopWaypointArray.length > i + 1) { // Check the next item to see if this should be semi-weekly.
									let tempShopWaypointJson = await ApiFunctions.getCustomizationItem(headers, mainShopWaypointArray[i + 1].OfferingDisplayPath);
									if (tempShopWaypointJson.FlairText.toLowerCase() === "daily") { // If the next item is daily, this is a semi-weekly listing most likely.
										mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_SEMI_WEEKLY];
									}
									else {
										mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_WEEKLY];
									}
								}
								else {
									mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_WEEKLY];
								}

								break;
							case "daily":
								mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_DAILY];
								// We need to update the prior bundle to be semi-weekly.
								if (shopSiteArray.length > 0) {
									shopSiteArray[shopSiteArray.length - 1][ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_SEMI_WEEKLY];
								}
								break;
							default:
								mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_INDEFINITE];
						}
					}
					else {
						// These bundles are available rather uniquely. Let's specify that.
						mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_CUSTOMIZATION_MENU];
					}

					if (shopWaypointJson.Title == "Boost and Swap Pack" || h == 1) {
						// This is basically the only time we see Indefinite Shop Bundles (HCS or the Boost and Swap Pack).
						mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD] = [ShopConstants.SHOP_INDEFINITE];
					}

					let qualityId = qualityDict[shopWaypointJson.Quality];

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
					
					if (processCustomizationOptions) {
						mainShopSiteJson[ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD] = true;
						mainShopSiteJson[ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD] = false;
					}
					else {
						mainShopSiteJson[ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD] = true;
					}

					let bundleType = (mainShopSiteJson[ShopConstants.SHOP_IS_HCS_FIELD]) ? "HCS" : mainShopSiteJson[ShopConstants.SHOP_TIME_TYPE_FIELD][0];

					if (processCustomizationOptions) {
						// Get the existing ETag from the DB.
						let existingETag = await wixData.query(ShopConstants.SHOP_DB)
							.eq(ShopConstants.SHOP_WAYPOINT_ID_FIELD, mainShopWaypointArray[i].OfferingId)
							.find()
							.then((results) => {
								if (results.items.length > 0) {
									return results.items[0][ShopConstants.SHOP_IMAGE_ETAG_FIELD];
								}
								else {
									return "";
								}
							})
							.catch((error) => {
								console.error("Error occurred while retrieving Image ETag from Shop DB for " + mainShopWaypointArray[i].OfferingId, error);
							});

						
						let imageResults = await MediaManagerFunctions.getCustomizationImageUrl(
							folderDict,
							headers,
							shopWaypointJson.Title,
							shopWaypointJson.ObjectImagePath,
							"image/png",
							ShopConstants.SHOP_KEY,
							bundleType,
							null,
							null,
							null,
							existingETag,
							true
						);

						mainShopSiteJson[ShopConstants.SHOP_BUNDLE_IMAGE_FIELD] = imageResults[0]; // The image URL is here.
						mainShopSiteJson[ShopConstants.SHOP_IMAGE_ETAG_FIELD] = imageResults[1]; // The image ETag is here.
					}
					else {
						mainShopSiteJson[ShopConstants.SHOP_BUNDLE_IMAGE_FIELD] = await MediaManagerFunctions.getCustomizationImageUrl(
							folderDict,
							headers,
							shopWaypointJson.Title,
							shopWaypointJson.ObjectImagePath,
							"image/png",
							ShopConstants.SHOP_KEY,
							bundleType
						);
					}

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
						let foundType = false; // Should become true if the type is found.
						for (let typeCategory in typeDict) {
							if (typeDict[typeCategory].includes(includedItemsArray[j].ItemType)) { // If the ItemType belongs to this typeCategory.
								let possibleMultiCore = false;

								foundType = true; // We found the type.
								let waypointIdMatchArray = includedItemsArray[j].ItemPath.match(GeneralConstants.REGEX_WAYPOINT_ID_FROM_PATH); // We'll be parsing this info from the path now.
								let waypointId = "";
								if (waypointIdMatchArray.length > 0) {
									waypointId = waypointIdMatchArray[0]; 
									//console.log(waypointId);
								}

								let exactWaypointId = waypointId;

								let typeCategoryArray = [typeCategory];

								if (includedItemsArray[j].ItemType.includes("Emblem")) {
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

								if (includedItemsArray[j].ItemType.includes("Coating")) {
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
									const SHOP_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[currentTypeCategory].ShopReferenceField;
									
									let itemId = "";
									let itemIdArray = []; // This will only be used if possibleMultiCore is set.
									try {
										if (possibleMultiCore) {
											itemIdArray = await getItemId(currentTypeCategory, waypointId, possibleMultiCore, exactWaypointId);
											//console.log(itemIdArray, "Contents of item Id Array");
										}
										else {
											itemId = await getItemId(currentTypeCategory, waypointId);
										}
									}
									catch (error) {
										console.error("Couldn't get item ID for waypoint ID " + waypointId + " due to " + error);
										console.log("Querying API for Waypoint ID...");
										let itemJson = await ApiFunctions.getCustomizationItem(headers, includedItemsArray[j].ItemPath);

										if (possibleMultiCore) {
											let matches = itemJson.CommonData.Id.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

											if (matches.length > 0) {
												waypointId = matches[0];
											}

											itemIdArray = await getItemId(currentTypeCategory, waypointId, possibleMultiCore, itemJson.CommonData.Id);
										}
										else {
											itemId = await getItemId(currentTypeCategory, itemJson.CommonData.Id);
											
											let matches = itemJson.CommonData.Id.match(GeneralConstants.REGEX_FINAL_CHARS_FROM_WAYPOINT_ID);

											if (matches.length > 0) {
												waypointId = matches[0];
											}
										}
									}

									if (possibleMultiCore) {
										for (let q = 0; q < itemIdArray.length; ++q) {
											if (!mainShopSiteJson[SHOP_ITEM_REFERENCE_FIELD].includes(itemIdArray[q])) {
												mainShopSiteJson[SHOP_ITEM_REFERENCE_FIELD].push(itemIdArray[q]);
											}
										}
									}
									else {
										if (!mainShopSiteJson[SHOP_ITEM_REFERENCE_FIELD].includes(itemId)) {
											mainShopSiteJson[SHOP_ITEM_REFERENCE_FIELD].push(itemId);
										}
									}

									if (!mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].includes(SHOP_ITEM_REFERENCE_FIELD)) {
										mainShopSiteJson[ShopConstants.SHOP_FIELDS_WITH_ITEMS_FIELD].push(SHOP_ITEM_REFERENCE_FIELD);
									}
								}

								break;
                            }
						}

						if (foundType) {
							continue;
						}
						else {
							console.warn("Discovered item with type " + includedItemsArray[j].ItemType + " that does not fit within an expected category.");
						}
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
					await GeneralFunctions.sleep(2000);

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

export async function qualityTest() {
	let qualityDict = {}; // The keys will be quality values (e.g. "Epic" or "Legendary"), and the values will be quality IDs. Let's us avoid querying the DB for every quality inquiry.
	await wixData.query(CustomizationConstants.QUALITY_DB)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				console.log("Quality values found", results);
				for (let i = 0; i < results.items.length; ++i) {
					qualityDict[results.items[i].quality] = results.items[i]._id;
				}
			}
			else {
				throw "No quality values found in the DB! Major emergency!";
			}
		})
		.catch((error) => {
			console.error(error, "occurred while filling in quality dict");
		});
	
	return qualityDict;
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

	let retry = true; // This becomes false if the query succeeded.
	let retryCount = 0; // This increments on each failed attempt.
	const MAX_RETRIES = 10; // The total number of attempts to try.

	while (retry && retryCount < MAX_RETRIES) {
		await wixData.query(CUSTOMIZATION_DB)
			.hasSome("_id", itemIdArray)
			.include()
			.include(SOCKET_REFERENCE_FIELD)
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

						let itemType = item[SOCKET_REFERENCE_FIELD][SOCKET_NAME_FIELD];

						let itemCore = "";

						if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
							// If we have cores for this item.
							const CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
							const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;

							let parentCores = (await wixData.queryReferenced(CUSTOMIZATION_DB, item._id, CORE_REFERENCE_FIELD)).items;

							// We only care about the parent core if there's only one core the item works with and the core isn't the "Any" shortcut.
							if (parentCores.length == 1 && parentCores[0][CORE_NAME_FIELD] != "Any") {
								itemCore = parentCores[0][CORE_NAME_FIELD];
							}
						}

						itemInfoArray.push({
							itemName: item[NAME_FIELD],
							itemUrl: GeneralConstants.INFINITE_NEWS_URL_BASE + item[URL_FIELD],
							itemType: itemType,
							itemCore: itemCore
						});
					}

					console.log("Given these items", items, "Only updating these items", itemsToUpdate, "Marking currentlyAvailable as " + currentlyAvailableStatus);

					wixData.bulkUpdate(CUSTOMIZATION_DB, itemsToUpdate, options)
						.then((results) => {
							console.log("Results following update of currentlyAvailable for category", customizationCategory, "and item array", itemsToUpdate, ":", results);
						});
				}

				retry = false;
			})
			.catch((error) => {
				console.error("Error", error, "occurred while marking items as no longer available for category", customizationCategory, "and ID array", itemIdArray, "Try " + ++retryCount + " of " + MAX_RETRIES);
			});
	}
	
	return itemInfoArray;
}

// Accepts a site JSON file and marks all currentlyAvailable flags on the associated items as false within the DBs.
export async function updateBundleAndItemsCurrentlyAvailableStatus(itemJson, currentlyAvailableStatus, itemDb=ShopConstants.SHOP_DB, isCustomizationShopBundle = false) {

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let currentlyAvailableField = "";
	let fieldsWithItemsField = "";
	let consumableReferenceField = "";
	let referenceFieldToCategoryDict = {};

	if (itemDb == ShopConstants.SHOP_DB) {
		currentlyAvailableField = (isCustomizationShopBundle) ? ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD : ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD;
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
			referenceFieldToCategoryDict[currentField],
			itemJson[currentField],
			currentlyAvailableStatus
		));
	}

	let retry = true;
	let retryCount = 0;
	const MAX_RETRIES = 10;

	while (retry && retryCount < MAX_RETRIES) {
		await wixData.update(itemDb, itemJson, options)
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
							itemJsonCopy[ShopConstants.SHOP_IS_HCS_FIELD],
							itemJsonCopy[ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD]
						);
					}
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
				}

				retry = false;
			})
			.catch((error) => {
				console.error("Error", error, "occurred while updating item availability", itemJson, "Try " + ++retryCount + " of " + MAX_RETRIES);
			});
	}
	
	return itemInfoArray;
}

// We store item IDs in an array, which lets us query for items matching those IDs and then update them.
export async function addItemIdArrayToShopItem(bundleId, fieldName, itemIdArray, customizationCategory, bundleName, bundleCost, isHcs, isCustomizationBundle) {
	const PENDING_SOURCE_ID = CustomizationConstants.SOURCE_TYPE_PENDING_ID;
	const SHOP_SOURCE_ID = CustomizationConstants.SOURCE_TYPE_SHOP_ID;

	if (itemIdArray.length <= 0) {
		console.log("No processing necessary as itemIdArray is empty for " + customizationCategory + " and Shop Bundle Name " + bundleName);
		return [];
	}

	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let itemInfoArray = [];

	let retry = true;
	let retryCount = 0;
	const MAX_RETRIES = 10;

	while (retry && retryCount < MAX_RETRIES) {
		await wixData.replaceReferences(ShopConstants.SHOP_DB, fieldName, bundleId, itemIdArray, options)
			.then(() => {
				retry = false;
				//console.log("Added references for Shop item ", bundleId, " and fieldName ", fieldName);
			})
			.catch((error) => {
				console.error("Error", error, "occurred. Failed to add references for Shop item ", bundleId, " and fieldName ", fieldName, "Try " + ++retryCount + " of " + MAX_RETRIES);
			});
	}

	// We have three tasks for each item ID: update the source (if it is (Pending) or Pending), update the sourcetype reference, and mark it currently Available.
	// Consumables need to be done manually due to the lack of a single source for them.
	if (fieldName != ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD) {
		const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
		const CUSTOMIZATION_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceField;
		const CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;
		const CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;

		const SOCKET_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
		const NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField;
		const URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_URL_FIELDS[customizationCategory];

		const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;

		let retry = true;
		let retryCount = 0;
		const MAX_RETRIES = 10;

		while (retry && retryCount < MAX_RETRIES) {
			await wixData.query(CUSTOMIZATION_DB)
				.hasSome("_id", itemIdArray)
				.include(SOCKET_REFERENCE_FIELD)
				.include(CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD)
				.find()
				.then(async (results) => {
					if (results.items.length > 0) {
						let items = results.items;
						let itemsToUpdate = []; // We only update items that need to be changed.

						for (let i = 0; i < items.length; ++i) {
							let item = items[i];
							let itemChanged = false;
							if (!item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD]) {
								item[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] = true;
								itemChanged = true;
							}

							// We need to update the source
							let sourceText = "";
							if (!isCustomizationBundle) {
								sourceText = "Purchase <em>" + bundleName.trim() + "</em> from the " + ((isHcs) ? "HCS " : "") + "Shop for " + bundleCost + " Credits";
							}
							else 
							{
								sourceText = "Purchase <em>" + bundleName.trim() + "</em> directly from the Customization Menus for " + bundleCost + " Credits";
							}

							if (item[CUSTOMIZATION_SOURCE_FIELD].includes("Pending")) {
								item[CUSTOMIZATION_SOURCE_FIELD] = sourceText;
								itemChanged = true;
							}
							else if (!item[CUSTOMIZATION_SOURCE_FIELD].includes(sourceText)) {
								item[CUSTOMIZATION_SOURCE_FIELD] += "<p class=\"font_8\">" + sourceText + "</p>";
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

							let sourceTypeRetry = true;
							let sourceTypeRetryCount = 0;
							const MAX_SOURCE_TYPE_RETRIES = 10;

							// We also need to update or replace the sourcetype. Thankfully, we included this field.
							while (sourceTypeRetry && sourceTypeRetryCount < MAX_SOURCE_TYPE_RETRIES) {
								if (item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD].length == 1 && item[CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD][0]._id == PENDING_SOURCE_ID) {
									// If we have exactly one source type and it's Pending, we want to get rid of it and do a replace.
									await wixData.replaceReferences(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [SHOP_SOURCE_ID])
										.then (() => {
											console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
											sourceTypeRetry = false;
										})
										.catch((error) => {
											console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB, "Try " + ++sourceTypeRetryCount + " of " + 
												MAX_SOURCE_TYPE_RETRIES);
										});
								}
								else if (!sourceTypeReferenceIncludesDesiredId) {
									// We just want to insert the source type in this case.
									await wixData.insertReference(CUSTOMIZATION_DB, CUSTOMIZATION_SOURCE_TYPE_REFERENCE_FIELD, item._id, [SHOP_SOURCE_ID])
										.then (() => {
											console.log("Added source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB);
											sourceTypeRetry = false;
										})
										.catch((error) => {
											console.error("Error", error, "occurred while adding source type reference for item " + item._id + " in DB " + CUSTOMIZATION_DB, "Try " + ++sourceTypeRetryCount + " of " + 
												MAX_SOURCE_TYPE_RETRIES);
										});
								}
								else {
									// Skip the source type retry.
									sourceTypeRetry = false;
								}
							}

							let itemType = item[SOCKET_REFERENCE_FIELD][SOCKET_NAME_FIELD];

							let itemCore = "";

							if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
								// If we have cores for this item.
								const CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
								const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;

								let parentCores = (await wixData.queryReferenced(CUSTOMIZATION_DB, item._id, CORE_REFERENCE_FIELD)).items;

								// We only care about the parent core if there's only one core the item works with and the core isn't the "Any" shortcut.
								if (parentCores.length == 1 && parentCores[0][CORE_NAME_FIELD] != "Any") {
									itemCore = parentCores[0][CORE_NAME_FIELD];
								}
							}

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

					retry = false;
				})
				.catch((error) => {
					console.error("Error", error, "occurred while updating newly available items for category", customizationCategory, "and ID array", itemIdArray, "Try " + ++retryCount + " of " + MAX_RETRIES);
				});
		}
	}
	else {
		// If we have Consumables, just update the itemInfoArray.
		let retry = true;
		let retryCount = 0;
		const MAX_RETRIES = 10;

		while (retry && retryCount < MAX_RETRIES) {
			try {
				let consumables = (await wixData.query(ConsumablesConstants.CONSUMABLES_DB).hasSome("_id", itemIdArray).find()).items;

				for (let i = 0; i < consumables.length; ++i) {
					itemInfoArray.push({
						itemName: consumables[ConsumablesConstants.CONSUMABLES_NAME_FIELD],
						itemUrl: GeneralConstants.INFINITE_NEWS_URL_BASE + consumables[ConsumablesConstants.CONSUMABLES_URL_FIELD],
						itemType: "" // This is redundant.
					});
				}

				retry = false;
			}
			catch(error) {
				console.error("Error", error, "occurred while retrieving consumables information. Try " + ++retryCount + " of " + MAX_RETRIES);
			}
		}
	}

	return itemInfoArray;
}

async function addBundleToDb(shopBundleJson) {
	let options = {
		"suppressAuth": true,
		"suppressHooks": true
	};

	let shopBundleJsonCopy = structuredClone(shopBundleJson); // This ensures that insertions don't throw out our multi-references.

	console.log("Adding Shop Bundle " + shopBundleJson[ShopConstants.SHOP_ITEM_NAME_FIELD]);

	let addedBundle = {}
	
	let retry = true;
	let retryCount = 0;
	const MAX_RETRIES = 10;

	while (retry && retryCount < MAX_RETRIES) {
		addedBundle = await wixData.insert(ShopConstants.SHOP_DB, shopBundleJsonCopy, options) // This needs to await since we need the URL from the bundle for Twitter API stuff.
			.then((results) => {
				console.log("Inserted this bundle to the Shop DB: ", results);

				retry = false;
				return results;
			})
			.catch((error) => {
				console.error("Error", error, "occurred while attempting to add this Bundle to DB:", shopBundleJsonCopy, "Try " + ++retryCount + " of " + MAX_RETRIES);
			});
	}

	addedBundle.childItemInfo = [];

	for (const FIELD in CustomizationConstants.SHOP_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT) {
		let childItemInfoArray = await addItemIdArrayToShopItem(
			addedBundle._id,
			FIELD,
			shopBundleJson[FIELD],
			CustomizationConstants.SHOP_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[FIELD],
			shopBundleJson[ShopConstants.SHOP_ITEM_NAME_FIELD],
			shopBundleJson[ShopConstants.SHOP_COST_CREDITS_FIELD],
			shopBundleJson[ShopConstants.SHOP_IS_HCS_FIELD],
			shopBundleJson[ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD]
		);

		if (childItemInfoArray) {
			addedBundle.childItemInfo = addedBundle.childItemInfo.concat(childItemInfoArray);
		}
	}

	return addedBundle;
}

// This function generates the Twitter and Discord notifications
export async function generateSocialNotifications(updateItemArray) {

	// First, we count how many of each type of bundle has newly appeared.
	let numReturningWeeklyBundles = 0;
	let numNewWeeklyBundles = 0;
	let numReturningSemiWeeklyBundles = 0;
	let numNewSemiWeeklyBundles = 0;
	let numReturningDailyBundles = 0;
	let numNewDailyBundles = 0;
	let numReturningHcsBundles = 0;
	let numNewHcsBundles = 0;
	let numReturningIndefiniteBundles = 0;
	let numNewIndefiniteBundles = 0;

	for (let i = 0; i < updateItemArray.length; ++i) {

		console.log("Checking to see if this item is new/returning and daily/semi-weekly or weekly.", updateItemArray[i]);
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
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_SEMI_WEEKLY)) {
				updateItemArray[i].returning = true;
				numReturningSemiWeeklyBundles++;
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
			else if (updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD].includes(ShopConstants.SHOP_SEMI_WEEKLY)) {
				updateItemArray[i].returning = false;
				numNewSemiWeeklyBundles++;
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
	if (numReturningSemiWeeklyBundles > 0) {
		if (numReturningSemiWeeklyBundles == 1) {
			bundleSummaryArray.push(numReturningSemiWeeklyBundles + " returning Semi-Weekly Listing");
		}
		else {
			bundleSummaryArray.push(numReturningSemiWeeklyBundles + " returning Semi-Weekly Listings");
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
	if (numNewSemiWeeklyBundles > 0) {
		if (numNewSemiWeeklyBundles == 1) {
			bundleSummaryArray.push(numNewSemiWeeklyBundles + " new Semi-Weekly Listing");
		}
		else {
			bundleSummaryArray.push(numNewSemiWeeklyBundles + " new Semi-Weekly Listings");
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
		if (i < hcsBundleSummaryArray.length - 1) { // If we aren't at the end of the list.
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
	// These arrays will includes strings with one of two formats: "- [bundleName] ([creditCost] Credits)" or "- [bundleName] ([creditCost] Credits, last added [MM/DD/YYYY])"
	let mainItemListingArray = []; 
	let mainItemArray = [];
	let hcsItemListingArray = [];
	let hcsItemArray = [];

	for (let i = 0; i < updateItemArray.length; ++i) {
		if (updateItemArray[i].returning) {
			let lastAvailableDatetime = new Date(updateItemArray[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);

			let dateString = GeneralFunctions.getLongMonthDayYearFromDate(lastAvailableDatetime);

			if (!updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {
				mainItemListingArray.push("- " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits, last added " + dateString + ")");
				mainItemArray.push(updateItemArray[i]);
			}
			else {
				hcsItemListingArray.push("- " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits, last added " + dateString + ")");
				hcsItemArray.push(updateItemArray[i]);
			}
		}
		else {
			if (!updateItemArray[i][ShopConstants.SHOP_IS_HCS_FIELD]) {
				mainItemListingArray.push("- " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
					" Credits)");
				mainItemArray.push(updateItemArray[i]);
			}
			else {
				hcsItemListingArray.push("- " + updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " (" + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] +
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
			hcsTweetTextArray[currentHcsTweetIndex] += hcsItemListingArray[i] + "\n";
		}
	}

	const NUM_ARMOR_CORES = await WaypointFunctions.getNumCores(ArmorConstants.ARMOR_KEY);
	const NUM_WEAPON_CORES = await WaypointFunctions.getNumCores(WeaponConstants.WEAPON_KEY);
	const NUM_VEHICLE_CORES = await WaypointFunctions.getNumCores(VehicleConstants.VEHICLE_KEY);

	if (mainItemListingArray.length > 0) {
		console.log(tweetTextArray[0]);
		let parentId = await sendTweet(tweetTextArray[0]);
		for (let i = 1; i < tweetTextArray.length; ++i) {
			console.log(tweetTextArray[i]);
			parentId = await sendTweet(tweetTextArray[i], parentId);
		}

		let discordMessageText = "";
		tweetTextArray.forEach((tweet) => {
			discordMessageText += tweet;
		});

		await sendDiscordMessage("shop", discordMessageText, true); // Include notification in the message.

		for (let i = 0; i < mainItemArray.length; ++i) {
			// Twitter links are always 23 characters, so while this may be longer at first, it should be parsed successfully when shortened down to 23 chars...I think...
			const URL_LENGTH_SHORTENING_OFFSET = (GeneralConstants.INFINITE_NEWS_URL_BASE + mainItemArray[i][ShopConstants.SHOP_URL_FIELD]).length - 23;
			let subTweetText = GeneralConstants.INFINITE_NEWS_URL_BASE + mainItemArray[i][ShopConstants.SHOP_URL_FIELD] + 
				"\nThe " + mainItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " Listing includes:\n";

			// Subtweets may not be longer than 280 characters. Need to adjust for this.
			let subTweetTextArray = [subTweetText];
			let currentSubTweetIndex = 0;

			let emblemNamesToSkip = [];
			let armorCoatingNamesToSkip = [];
			let weaponCoatingNamesToSkip = [];
			let vehicleCoatingNamesToSkip = [];

			for (let j = 0; j < mainItemArray[i].childItemInfo.length; ++j) {
				let childItem = mainItemArray[i].childItemInfo[j];
				let childItemText = "- " + childItem.itemName + " " + childItem.itemType + ((childItem.itemCore != "") ? (" (" + childItem.itemCore + ")") : "") + "\n";
				
				// We want to abbreviate sets of four identical emblem types as "Emblem Set". This will shorten our Tweet count considerably.
				if (childItem.itemType.includes("Nameplate") || childItem.itemType.includes("Emblem")) {
					if (emblemNamesToSkip.includes(childItem.itemName)) { // We already noted this Emblem Set. Let's proceed.
						continue;
					}

					let matchingEmblemsFound = 0; // Count the number of matching emblems in the list.
					mainItemArray[i].childItemInfo.forEach((item) => {
						if (item.itemName == childItem.itemName && (item.itemType.includes("Nameplate") || item.itemType.includes("Emblem"))) {
							++matchingEmblemsFound;
						}
					});

					if (matchingEmblemsFound >= 4) { // If we found all four types of emblem in the list.
						childItemText = "- " + childItem.itemName + " Emblem Set\n";
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
					mainItemArray[i].childItemInfo.forEach((item) => {
						if (item.itemName == childItem.itemName && item.itemType == childItem.itemType) {
							++matchingCoatingsFound;
						}
					});

					if (childItem.itemType.includes("Armor Coating") && matchingCoatingsFound >= NUM_ARMOR_CORES
					|| childItem.itemType.includes("Weapon Coating") && matchingCoatingsFound >= NUM_WEAPON_CORES
					|| childItem.itemType.includes("Vehicle Coating") && matchingCoatingsFound >= NUM_VEHICLE_CORES) { // If we found an instance of the coating on all available cores.
						childItemText = "- " + childItem.itemName + " " + childItem.itemType + " (All Cores)\n";
						if (childItem.itemType.includes("Armor Coating")) { armorCoatingNamesToSkip.push(childItem.itemName); }
						if (childItem.itemType.includes("Weapon Coating")) { weaponCoatingNamesToSkip.push(childItem.itemName); }
						if (childItem.itemType.includes("Vehicle Coating")) { vehicleCoatingNamesToSkip.push(childItem.itemName); }
					}
				}

				if (currentSubTweetIndex != 0 && subTweetTextArray[currentSubTweetIndex].length + childItemText.length > 280) {
					++currentSubTweetIndex;
					subTweetTextArray.push(childItemText);
				} 
				// Account for URL shortening.
				else if (currentSubTweetIndex == 0 && subTweetTextArray[currentSubTweetIndex].length + childItemText.length - URL_LENGTH_SHORTENING_OFFSET > 280) {
					++currentSubTweetIndex;
					subTweetTextArray.push(childItemText);
				}
				else {
					subTweetTextArray[currentSubTweetIndex] += childItemText;
				}
			}
			
			console.log("Subtweet Array has length " + subTweetTextArray.length, subTweetTextArray);

			for (let i = 0; i < subTweetTextArray.length; ++i) {
				console.log(subTweetTextArray[i]);
				parentId = await sendTweet(subTweetTextArray[i], parentId);
			}

			let discordMessageSubText = "";
			subTweetTextArray.forEach((tweet) => {
				discordMessageSubText += tweet;
			});

			await sendDiscordMessage("shop", discordMessageSubText); // Include notification in the message.
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
			discordMessageText += tweet;
		});

		await sendDiscordMessage("shop", discordMessageText, true); // Include notification in the message.

		for (let i = 0; i < hcsItemArray.length; ++i) {
			// Twitter links are always 23 characters, so while this may be longer at first, it should be parsed successfully when shortened down to 23 chars...I think...
			const URL_LENGTH_SHORTENING_OFFSET = (GeneralConstants.INFINITE_NEWS_URL_BASE + hcsItemArray[i][ShopConstants.SHOP_URL_FIELD]).length - 23;
			let subTweetText = GeneralConstants.INFINITE_NEWS_URL_BASE + hcsItemArray[i][ShopConstants.SHOP_URL_FIELD] + 
				"\nThe " + hcsItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD] + " Listing includes:\n";

			// Subtweets may not be longer than 280 characters. Need to adjust for this.
			let subTweetTextArray = [subTweetText];
			let currentSubTweetIndex = 0;

			let emblemNamesToSkip = [];
			let armorCoatingNamesToSkip = [];
			let weaponCoatingNamesToSkip = [];
			let vehicleCoatingNamesToSkip = [];

			for (let j = 0; j < hcsItemArray[i].childItemInfo.length; ++j) {
				let childItem = hcsItemArray[i].childItemInfo[j];
				let childItemText = "- " + childItem.itemName + " " + childItem.itemType + ((childItem.itemCore != "") ? (" (" + childItem.itemCore + ")") : "") + "\n";
				
				// We want to abbreviate sets of four identical emblem types as "Emblem Set". This will shorten our Tweet count considerably.
				if (childItem.itemType.includes("Nameplate") || childItem.itemType.includes("Emblem")) {
					if (emblemNamesToSkip.includes(childItem.itemName)) { // We already noted this Emblem Set. Let's proceed.
						continue;
					}

					let matchingEmblemsFound = 0; // Count the number of matching emblems in the list.
					hcsItemArray[i].childItemInfo.forEach((item) => {
						if (item.itemName == childItem.itemName && (item.itemType.includes("Nameplate") || item.itemType.includes("Emblem"))) {
							++matchingEmblemsFound;
						}
					});

					if (matchingEmblemsFound >= 4) { // If we found all four types of emblem in the list.
						childItemText = "- " + childItem.itemName + " Emblem Set\n";
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
					hcsItemArray[i].childItemInfo.forEach((item) => {
						if (item.itemName == childItem.itemName && item.itemType == childItem.itemType) {
							++matchingCoatingsFound;
						}
					});

					if (childItem.itemType.includes("Armor Coating") && matchingCoatingsFound >= NUM_ARMOR_CORES
					|| childItem.itemType.includes("Weapon Coating") && matchingCoatingsFound >= NUM_WEAPON_CORES
					|| childItem.itemType.includes("Vehicle Coating") && matchingCoatingsFound >= NUM_VEHICLE_CORES) { // If we found an instance of the coating on all available cores.
						childItemText = "- " + childItem.itemName + " " + childItem.itemType + " (All Cores)\n";
					}
				}

				if (currentSubTweetIndex != 0 && subTweetTextArray[currentSubTweetIndex].length + childItemText.length > 280) {
					++currentSubTweetIndex;
					subTweetTextArray.push(childItemText);
				} 
				// Account for URL shortening.
				else if (currentSubTweetIndex == 0 && subTweetTextArray[currentSubTweetIndex].length + childItemText.length - URL_LENGTH_SHORTENING_OFFSET > 280) {
					++currentSubTweetIndex;
					subTweetTextArray.push(childItemText);
				}
				else {
					subTweetTextArray[currentSubTweetIndex] += childItemText;
				}
			}
			
			console.log("Subtweet Array has length " + subTweetTextArray.length, subTweetTextArray);

			for (let i = 0; i < subTweetTextArray.length; ++i) {
				console.log(subTweetTextArray[i]);
				parentId = await sendTweet(subTweetTextArray[i], parentId);
			}

			let discordMessageSubText = "";
			subTweetTextArray.forEach((tweet) => {
				discordMessageSubText += tweet;
			});

			await sendDiscordMessage("shop", discordMessageSubText); // Include notification in the message.
		}
	}
}

export async function generatePushNotifications(updateItemArray) {
	if (updateItemArray.length > 1) {
		let title = "New Shop Listings Available!";
		let subtitle = "";
		let body = "Click here to view all the new Shop Listings";
		let url = GeneralConstants.INFINITE_NEWS_URL_BASE + ShopConstants.SHOP_LISTINGS_URL_SUFFIX;

		NotificationFunctions.sendPushNotification(title, body, subtitle, url);
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

		NotificationFunctions.sendPushNotification(updateItemArray[i][ShopConstants.SHOP_ITEM_NAME_FIELD],
			"New Halo Infinite Shop Listing available now for " + updateItemArray[i][ShopConstants.SHOP_COST_CREDITS_FIELD] + " Credits! Click here to view it.",
			updateItemArray[i][ShopConstants.SHOP_TIME_TYPE_FIELD][0] + " Listing",
			GeneralConstants.INFINITE_NEWS_URL_BASE + updateItemArray[i][ShopConstants.SHOP_URL_FIELD]);
	}
}

// This function will be called by the job scheduler.
export async function refreshShopListings() {
	let currentlyAvailableShopListings = await getCurrentlyAvailableShopListings();
	let newlyAvailableShopListings = await getConvertedShopList();

	if (currentlyAvailableShopListings.length <= 0) {
		throw "Error: No currently available Shop Listings were returned. Exiting now to avoid data poisoning.";
	}

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

						// Transfer the imageETag since we didn't grab it ourselves.
						newShopListingsToUpdate[i][ShopConstants.SHOP_IMAGE_ETAG_FIELD] = item[ShopConstants.SHOP_IMAGE_ETAG_FIELD];

						// If these arrays exist, we grab them to add onto them. Otherwise, we create it from scratch.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = item[ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] || [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = item[ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] || [];

						// We have to add this here because we need the existing array of datetimes.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]); 
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);

						console.log("Last added datetime for ", item[ShopConstants.SHOP_WAYPOINT_ID_FIELD], " is ", item[ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						console.log(newShopListingsToUpdate[i]);
						item.childItemInfo = await updateBundleAndItemsCurrentlyAvailableStatus(newShopListingsToUpdate[i], true);

						// We need to ensure that the name, cost, and bundle type are updated and passed to the Twitter and Push Notification functions.
						item[ShopConstants.SHOP_ITEM_NAME_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_ITEM_NAME_FIELD];
						item[ShopConstants.SHOP_COST_CREDITS_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD];
						item[ShopConstants.SHOP_TIME_TYPE_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_TIME_TYPE_FIELD];
						item[ShopConstants.SHOP_IS_HCS_FIELD] = newShopListingsToUpdate[i][ShopConstants.SHOP_IS_HCS_FIELD];
					}
					else { // If we didn't find the item, we need to add it. This is a bit involved since we also have to add references for each of its multi-references.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);
						console.log(newShopListingsToUpdate[i]);

						item = await addBundleToDb(newShopListingsToUpdate[i]); // We need to await this if we want to integrate with the Twitter API.

						// Add this item to the list of shop listings in the DB.
						items.push(structuredClone(item)); // Clone the item so we don't overwrite it later.
						itemIds.push(item[ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
					}

					updateItemArray.push(item);
				}
				
				console.log("Update item array:", updateItemArray);

				generateSocialNotifications(updateItemArray);
				generatePushNotifications(updateItemArray);
			});
	}
}

// This is also called by the job scheduler. Thankfully, we don't need to send notifications for this.
// This is my first checkpointed function. I can't process the whole list of customization bundles at once, so I do it LIMIT at a time and store the offset to use in a
export async function refreshCustomizationShopListings() {
	//currentlyAvailableIds = await getCurrentlyAvailableShopListings(true); // We need this array so that we can check each newly available listing and see if we already have it available.

	let newCustomizationShopListings = [];
	try {
		newCustomizationShopListings = await getConvertedShopList(true);
	}
	catch (error) {
		console.error("Error occurred while getting shop list from API", error);
	}

	if (newCustomizationShopListings.length <= 0) {
		throw "Error: No new Shop Listings were returned. Exiting now.";
	}

	// We need a list of Waypoint IDs to query the database.
	let newlyAvailableShopListingIds = []; 

	for (let i = 0; i < newCustomizationShopListings.length; ++i) {
		newlyAvailableShopListingIds.push(newCustomizationShopListings[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);
	}

	let newShopListingsToUpdate = newCustomizationShopListings;

	if (newlyAvailableShopListingIds.length > 0) {
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

				console.log("Arrays to process:", itemIds, newShopListingsToUpdate);

				for(let i = 0; i < newShopListingsToUpdate.length; ++i) { // We're assuming everything else has been marked correctly. Big assumption, yes, but potentially more efficient.
					let item;
					let itemIndex = itemIds.findIndex((itemId) => { return newShopListingsToUpdate[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD] == itemId; });
					console.log("Item index is ", itemIndex, "for item ID", newShopListingsToUpdate[i][ShopConstants.SHOP_WAYPOINT_ID_FIELD]);

					if (itemIndex > -1) { // If the item was found.
						item = items[itemIndex];
						if (item[ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD]) {
							console.log("Skipping this shop bundle as it is already available in the Shop right now.", newShopListingsToUpdate[i]);
							continue; // We don't want to process listings that are actually in the Shop right now.
						}

						newShopListingsToUpdate[i]._id = item._id; // The DB ID ties both items together, so we need to transfer it.

						// If these arrays exist, we grab them to add onto them. Otherwise, we create it from scratch.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = item[ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] || [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = item[ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] || [];

						// We have to add this here because we need the existing array of datetimes.
						if (!item[ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD]) {
							// We only want to add this if it isn't already marked as available through the customization menus.
							newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]); 
							newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);
						}
						else if (newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD] != newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD][0]) {
							// If the current cost doesn't match the last available cost, then we need to add a new record.
							let currentDate = new Date();

							newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(currentDate);
							newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);
						}
						else {
							newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD] = item[ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD];
							// This isn't newly available, and the price hasn't changed.
						}

						newShopListingsToUpdate[i][ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD] = item[ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD]; // This listing may be available through the normal shop, too.

						console.log("Last added datetime for ", item[ShopConstants.SHOP_WAYPOINT_ID_FIELD], " is ", item[ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						console.log(newShopListingsToUpdate[i]);
						await updateBundleAndItemsCurrentlyAvailableStatus(newShopListingsToUpdate[i], true, ShopConstants.SHOP_DB, true);
					}
					else { // If we didn't find the item, we need to add it. This is a bit involved since we also have to add references for each of its multi-references.
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD] = [];
						newShopListingsToUpdate[i][ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_LAST_AVAILABLE_DATETIME_FIELD]);
						newShopListingsToUpdate[i][ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD].unshift(newShopListingsToUpdate[i][ShopConstants.SHOP_COST_CREDITS_FIELD]);
						console.log(newShopListingsToUpdate[i]);

						item = await addBundleToDb(newShopListingsToUpdate[i]); // We need to await this if we want to integrate with the Twitter API.
					}
				}

				let currentOffsetObject = await wixData.query(KeyConstants.KEY_VALUE_DB)
					.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_SHOP_OFFSET_KEY)
					.find()
					.then((results) => {
						if (results.items.length == 0) {
							throw "Offset not found in Key Value DB. Throwing error.";
						}
						else {
							return results.items[0];
						}
					})
					.catch((error) => {
						console.error("Error occurred when determining offset. Throwing", error);
						throw "Dying because unable to retrieve offset from Key Value DB.";
					});

				currentOffsetObject.value.offset = (resetOffset) ? 0 : currentOffsetObject.value.offset + CUSTOMIZATION_SHOP_LIMIT;

				wixData.update(KeyConstants.KEY_VALUE_DB, currentOffsetObject)
					.catch((error) => {
						console.error(error, "occurred when updating current offset value");
						InternalNotifications.notifyOwner("Error when updating customization shop offset.", "Resolve this issue promptly to ensure updates continue to occur.");
					});

				console.log("Current offset updated to " + currentOffsetObject.value.offset);
			});
	}
}

export async function deactivateUnavailableCustomizationShopListings() {
	// If we find a Customization Menu shop listing that hasn't been updated for 8 days, we can mark it unavailable through the customization menus.
	const DAYS_BACK = 8; // We will mark these bundles deactivated if they go more than 8 days without an update (our function currently has a loop period of at least 5 hours; this may change in the future).

	await wixData.query(ShopConstants.SHOP_DB)
		.eq(ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD, true)
		.le("_updatedDate", new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000)) // Convert the DAYS_BACK into a ms value to subtract from the current time.
		.limit(1000)
		.find()
		.then((results) => {
			let oldListings = results.items;
			console.log("Marking the following listings as no longer available", oldListings);
			for (let i = 0; i < oldListings.length; ++i) {
				oldListings[i][ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD] = false;
			}

			wixData.bulkUpdate(ShopConstants.SHOP_DB, oldListings)
				.then(result => {
					console.log("Results of marking the listings as no longer available: ", result, oldListings);
				})
				.catch((error) => {
					console.error("Error occurred when marking old customization shop listings as unavailable.", error);
				});
		})
		.catch((error) => {
			console.error("Error occurred while retrieving customization shop listings that have not been touched in " + DAYS_BACK + " days.", error);
		})
}


export function regexTest(waypointPath) {
	return waypointPath.match(GeneralConstants.REGEX_WAYPOINT_ID_FROM_PATH)[0];
}
