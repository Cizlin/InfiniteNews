// This code is used to query the Customization databases whenever a user provides a string in the CustomizationSearchBar. The flow should be as follows:
// User types the name of an item they want to find (or text within that name).
// User presses enter. This takes them to the Customization Search Results page, puts their query into the primary search bar, and then shows the matching results.
// Results are determined by querying each database's name field for names containing the search term.

import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';

import * as GeneralFunctions from 'public/General.js';

import * as wixData from 'wix-data';

class SearchResult {
    constructor(_id, name, description, url, image, hasVideo=false) {
        this._id = _id;
        this.name = name;
        this.description = description;
        this.url = url;
        this.image = image;
        this.hasVideo = hasVideo;
    }
}

function databaseQueriesComplete(databaseQueryComplete) {
    for (let database in databaseQueryComplete) {
        // If we find any database that still hasn't finished querying, we need to return false.
        if (!databaseQueryComplete[database]) {
            return false;
        }
    }

    // All databases have finished. Return true.
    return true;
}

export async function nameSearch(nameSearchValue, categoriesToQuery, searchStatus) {
    searchStatus[0] = true; // Initialize the search status to true. We change it to false if we encounter errors.
    let databaseQueryComplete = {}; // When one of the values becomes true, the database in the key for that value has been fully queried.

    let searchResultsByDatabase = {}; // The search results of each database query will be stored in an independent array, which will then be consolidated after all results are available.
        

    // Query all the Customization DBs
    for (let category in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS) {
        if (!categoriesToQuery.includes(CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SearchCategory)) {
            continue; // We skip categories we didn't select.
        }

        const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationDb;
        databaseQueryComplete[CUSTOMIZATION_DB] = false; // Initialize the query flag to false.
        searchResultsByDatabase[CUSTOMIZATION_DB] = []; // Initialize the list of results for this DB.

        const NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationNameField;
        const LORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationLoreField;
        const URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationUrlField;
        const IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationImageField;
        const VIDEO_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationEffectVideoField;
        const TYPE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationSocketReferenceField;
        const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SocketNameField
        const CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CustomizationCoreReferenceField;
        const CORE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].CoreNameField;
        const TYPE_IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SocketIsCrossCoreField;
        const TYPE_IS_PARTIALLY_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SocketIsPartialCrossCoreField;

        let query = wixData.query(CUSTOMIZATION_DB)
            .contains(NAME_FIELD, nameSearchValue)
            .ascending(NAME_FIELD)
            .include(TYPE_FIELD);

        if (category in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT) {
            // Include the cores in our query.
            query = query.include(CORE_FIELD)
        }
        
        query.find()
            .then((results) => {
                for (let item of results.items) {

                    let searchResultTitle = "";
                    if (category in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT
                        && !item[TYPE_FIELD][TYPE_IS_CROSS_CORE_FIELD]
                        && !item[TYPE_FIELD][TYPE_IS_PARTIALLY_CROSS_CORE_FIELD]) {
                        // If the item has a parent core and is neither fully nor partially cross-core.
                        searchResultTitle = item[NAME_FIELD] + " " + item[TYPE_FIELD][TYPE_NAME_FIELD] + "\n" + item[CORE_FIELD][0][CORE_NAME_FIELD];
                    }
                    else {
                        searchResultTitle = item[NAME_FIELD] + " " + item[TYPE_FIELD][TYPE_NAME_FIELD];
                    }

                    let searchItem = new SearchResult(
                        item._id,
                        searchResultTitle,
                        item[LORE_FIELD],
                        item[URL_FIELD],
                        (VIDEO_FIELD && item[VIDEO_FIELD]) ? item[VIDEO_FIELD] : item[IMAGE_FIELD], // If the item has a video, use the video in the preview.
                        (VIDEO_FIELD && item[VIDEO_FIELD]));
                    searchResultsByDatabase[CUSTOMIZATION_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CUSTOMIZATION_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CUSTOMIZATION_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[CUSTOMIZATION_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query all the Core DBs
    for (let category in CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS) {
        if (!categoriesToQuery.includes(CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].SearchCategory)) {
            continue; // We skip categories we didn't select.
        }

        const CORE_DB = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreDb;
        databaseQueryComplete[CORE_DB] = false; // Initialize the query flag to false.
        searchResultsByDatabase[CORE_DB] = []; // Initialize the list of results for this DB.

        const NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreNameField;
        const LORE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreLoreField;
        const URL_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreUrlField;
        const IMAGE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreImageField;
        const CORE_TYPE = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].CoreType;

        wixData.query(CORE_DB)
            .contains(NAME_FIELD, nameSearchValue)
            .ascending(NAME_FIELD)
            .find()
            .then((results) => {
                for (let item of results.items) {
                    let searchItem = new SearchResult(
                        item._id,
                        item[NAME_FIELD] + " " + CORE_TYPE,
                        item[LORE_FIELD],
                        item[URL_FIELD],
                        item[IMAGE_FIELD]);
                    searchResultsByDatabase[CORE_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CORE_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CORE_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[CORE_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Consumables DB
    if (categoriesToQuery.includes("Consumables")) {
        databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = false;
        searchResultsByDatabase[ConsumablesConstants.CONSUMABLES_DB] = [];

        wixData.query(ConsumablesConstants.CONSUMABLES_DB)
            .contains(ConsumablesConstants.CONSUMABLES_NAME_FIELD, nameSearchValue)
            .ascending(ConsumablesConstants.CONSUMABLES_NAME_FIELD)
            .find()
            .then((results) => {
                for (let item of results.items) {
                    let searchItem = new SearchResult(
                        item._id,
                        item[ConsumablesConstants.CONSUMABLES_NAME_FIELD] + " Consumable",
                        item[ConsumablesConstants.CONSUMABLES_DESCRIPTION_FIELD],
                        item[ConsumablesConstants.CONSUMABLES_URL_FIELD],
                        item[ConsumablesConstants.CONSUMABLES_IMAGE_FIELD]);
                    searchResultsByDatabase[ConsumablesConstants.CONSUMABLES_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + ConsumablesConstants.CONSUMABLES_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Capstone Challenge DB
    if (categoriesToQuery.includes("Ultimate Challenges")) {
        databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = false;
        searchResultsByDatabase[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = [];

        wixData.query(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB)
            .contains(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD, nameSearchValue)
            .ascending(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD)
            .find()
            .then(async (results) => {
                for (let item of results.items) {
                    // We'll use the image and link to the reward item, just like we do on the Capstone Challenge page.
                    let rewardItemField = item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0]
                    let rewardItemResults = await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, item, rewardItemField);
                    let rewardItem = rewardItemResults.items[0];

                    const CATEGORY = CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[rewardItemField];
                    
                    let searchItem = new SearchResult(
                        item._id,
                        item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD] + " Ultimate Challenge",
                        item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] + ": " + item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD],
                        rewardItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CATEGORY].CustomizationUrlField],
                        rewardItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CATEGORY].CustomizationImageField]);

                    searchResultsByDatabase[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Pass DB
    if (categoriesToQuery.includes("Passes")) {
        databaseQueryComplete[PassConstants.PASS_DB] = false;
        searchResultsByDatabase[PassConstants.PASS_DB] = [];

        wixData.query(PassConstants.PASS_DB)
            .contains(PassConstants.PASS_TITLE_FIELD, nameSearchValue)
            .ascending(PassConstants.PASS_TITLE_FIELD)
            .find()
            .then((results) => {
                for (let item of results.items) {
                    let searchItem = new SearchResult(
                        item._id,
                        item[PassConstants.PASS_TITLE_FIELD] + " " + ((item[PassConstants.PASS_IS_EVENT_FIELD]) ? "Event" : "Battle") + " Pass",
                        item[PassConstants.PASS_DESCRIPTION_FIELD],
                        item[PassConstants.PASS_URL_FIELD],
                        item[PassConstants.PASS_IMAGE_FIELD]);
                    searchResultsByDatabase[PassConstants.PASS_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[PassConstants.PASS_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + PassConstants.PASS_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[PassConstants.PASS_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Shop DB
    if (categoriesToQuery.includes("Shop Listings")) {
        databaseQueryComplete[ShopConstants.SHOP_DB] = false;
        searchResultsByDatabase[ShopConstants.SHOP_DB] = [];

        wixData.query(ShopConstants.SHOP_DB)
            .contains(ShopConstants.SHOP_ITEM_NAME_FIELD, nameSearchValue)
            .ascending(ShopConstants.SHOP_ITEM_NAME_FIELD)
            .find()
            .then((results) => {
                for (let item of results.items) {
                    let searchItem = new SearchResult(
                        item._id,
                        item[ShopConstants.SHOP_ITEM_NAME_FIELD] + " Shop Listing",
                        item[ShopConstants.SHOP_DESCRIPTION_FIELD],
                        item[ShopConstants.SHOP_URL_FIELD],
                        item[ShopConstants.SHOP_BUNDLE_IMAGE_FIELD]);
                    searchResultsByDatabase[ShopConstants.SHOP_DB].push(searchItem);
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[ShopConstants.SHOP_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + ShopConstants.SHOP_DB + " database.");
                searchStatus[0] = false;
                databaseQueryComplete[ShopConstants.SHOP_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    let iterationCounter = 0; // We want to abort if it takes too long. Hopefully it won't, but let's use a 30-second timer just in case.
    while(!databaseQueriesComplete(databaseQueryComplete) && iterationCounter < 30) {
        // Sleep for 1 second to avoid overwhelming the local PC.
        await GeneralFunctions.sleep(1000);
        iterationCounter++;
    }

    if (iterationCounter >= 30 && !databaseQueriesComplete(databaseQueryComplete)) {
        // Timed out.
        console.error("Timed out while trying to query the databases. Please try again.");
    }

    let consolidatedSearchResults = [];

    for (let database in searchResultsByDatabase) {
        consolidatedSearchResults = consolidatedSearchResults.concat(searchResultsByDatabase[database]);
    }

    // Sort the results alphabetically.
    consolidatedSearchResults.sort((a, b) => {
        if (a.name > b.name) { // Put a after b.
            return 1;
        }
        else if (a.name < b.name) { // Put a before b.
            return -1;
        }
        else { // Keep the order the same.
            return 0;
        }
    });

    console.log(consolidatedSearchResults);

    return consolidatedSearchResults;
}

