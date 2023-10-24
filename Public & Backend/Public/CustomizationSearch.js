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

const QUERY_LIMIT = 1000;
const QUICKSEARCH_QUERY_LIMIT = 5;

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

// The quicksearch option allows us to return a minimal number of database records and obtain their name(s). It uses a startsWith filter to suggest valid names within all the selected databases.
// The normal operation is to return an array of SearchResult object, but the quicksearch operation just returns an array of distinct names of minimal, controlled length.
export async function nameSearch(nameSearchValue, categoriesToQuery, searchStatus, quickSearch=false, quickSearchLimit=QUICKSEARCH_QUERY_LIMIT) {
    searchStatus[0] = 0; // Initialize the search status to true. We change it to false if we encounter errors.
    let databaseQueryComplete = {}; // When one of the values becomes true, the database in the key for that value has been fully queried.

    let searchResultsByDatabase = {}; // The search results of each database query will be stored in an independent array, which will then be consolidated after all results are available.
        

    // Query all the Customization DBs
    for (let category in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS) {
        if (!categoriesToQuery.includes(CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SearchCategory)
            && !categoriesToQuery.includes("All")) {
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
            .ascending(NAME_FIELD)
            .include(TYPE_FIELD);

        if (category in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT) {
            query = query.include(CORE_FIELD);
        }

        if (quickSearch) {
            query = query.limit(QUICKSEARCH_QUERY_LIMIT).startsWith(NAME_FIELD, nameSearchValue);
        }
        else {
            query = query.limit(50).contains(NAME_FIELD, nameSearchValue); // Use a limit of 50 explicitly because the implicit one stopped working I guess.
        }
        
        //console.log("Long search for " + nameSearchValue);
        //console.log("Query: ", query);

        query.find()
            .then(async (results) => {
                //console.log("Found results", results);
                for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
                            let searchResultTitle = "";
                            if (category in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT
                                && !item[TYPE_FIELD][TYPE_IS_CROSS_CORE_FIELD]
                                && !item[TYPE_FIELD][TYPE_IS_PARTIALLY_CROSS_CORE_FIELD]) {
                                // If the item has a parent core and is neither fully nor partially cross-core.
                                let coreInfo = item[CORE_FIELD];
                                searchResultTitle = item[NAME_FIELD] + " " + item[TYPE_FIELD][TYPE_NAME_FIELD] + "\n" + coreInfo[0][CORE_NAME_FIELD];
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
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[NAME_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[CUSTOMIZATION_DB].push(searchItem);
                        }
                    }

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CUSTOMIZATION_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CUSTOMIZATION_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[CUSTOMIZATION_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query all the Core DBs
    for (let category in CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS) {
        if (!categoriesToQuery.includes(CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[category].SearchCategory)
            && !categoriesToQuery.includes("All")) {
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

        let query = wixData.query(CORE_DB)
            .limit((quickSearch) ? quickSearchLimit : QUERY_LIMIT)
            .ne(NAME_FIELD, "Any") // Filter out the "Any" cores since they are just a convenience for the customization hierarchy browser.
            .ascending(NAME_FIELD);
            
        if (!quickSearch) {
            query = query.contains(NAME_FIELD, nameSearchValue);
        }
        else {
            query = query.startsWith(NAME_FIELD, nameSearchValue);
        }
            
        query.find()
            .then(async (results) => {
                for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
                            let searchItem = new SearchResult(
                                item._id,
                                item[NAME_FIELD] + " " + CORE_TYPE,
                                item[LORE_FIELD],
                                item[URL_FIELD],
                                item[IMAGE_FIELD]);
                            searchResultsByDatabase[CORE_DB].push(searchItem);
                        }
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[NAME_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[CORE_DB].push(searchItem);
                        }
                    }                    

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CORE_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CORE_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[CORE_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Consumables DB
    if (categoriesToQuery.includes("Consumables") || categoriesToQuery.includes("All")) {
        databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = false;
        searchResultsByDatabase[ConsumablesConstants.CONSUMABLES_DB] = [];

        let query = wixData.query(ConsumablesConstants.CONSUMABLES_DB)
            .limit((quickSearch) ? quickSearchLimit : QUERY_LIMIT)
            .ascending(ConsumablesConstants.CONSUMABLES_NAME_FIELD);

        if (!quickSearch) {
            query = query.contains(ConsumablesConstants.CONSUMABLES_NAME_FIELD, nameSearchValue);
        }
        else {
            query = query.startsWith(ConsumablesConstants.CONSUMABLES_NAME_FIELD, nameSearchValue);
        }
            
        query.find()
            .then(async (results) => {
               for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
                            let searchItem = new SearchResult(
                                item._id,
                                item[ConsumablesConstants.CONSUMABLES_NAME_FIELD] + " Consumable",
                                item[ConsumablesConstants.CONSUMABLES_DESCRIPTION_FIELD],
                                item[ConsumablesConstants.CONSUMABLES_URL_FIELD],
                                item[ConsumablesConstants.CONSUMABLES_IMAGE_FIELD]);
                            searchResultsByDatabase[ConsumablesConstants.CONSUMABLES_DB].push(searchItem);
                        }
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[ConsumablesConstants.CONSUMABLES_NAME_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[ConsumablesConstants.CONSUMABLES_DB].push(searchItem);
                        }
                    }                    

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + ConsumablesConstants.CONSUMABLES_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[ConsumablesConstants.CONSUMABLES_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Capstone Challenge DB
    if (categoriesToQuery.includes("Ultimate Challenges") || categoriesToQuery.includes("All")) {
        databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = false;
        searchResultsByDatabase[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = [];

        let query = wixData.query(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB)
            .limit((quickSearch) ? quickSearchLimit : QUERY_LIMIT)
            .ascending(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD);

        if (!quickSearch) {
            query = query.contains(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD, nameSearchValue);
        }
        else {
            query = query.startsWith(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD, nameSearchValue);
        }
            
        query.find()
            .then(async (results) => {
                for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
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
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB].push(searchItem);
                        }
                    }                    

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Pass DB
    if (categoriesToQuery.includes("Passes") || categoriesToQuery.includes("All")) {
        databaseQueryComplete[PassConstants.PASS_DB] = false;
        searchResultsByDatabase[PassConstants.PASS_DB] = [];

        let query = wixData.query(PassConstants.PASS_DB)
            .limit((quickSearch) ? quickSearchLimit : QUERY_LIMIT)
            .ascending(PassConstants.PASS_TITLE_FIELD);

        if (!quickSearch) {
            query = query.contains(PassConstants.PASS_TITLE_FIELD, nameSearchValue);
        }
        else {
            query = query.startsWith(PassConstants.PASS_TITLE_FIELD, nameSearchValue);
        }
            
        query.find()
            .then(async (results) => {
                for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
                            let searchItem = new SearchResult(
                                item._id,
                                item[PassConstants.PASS_TITLE_FIELD] + " " + ((item[PassConstants.PASS_IS_EVENT_FIELD]) ? "Event" : "Battle") + " Pass",
                                item[PassConstants.PASS_DESCRIPTION_FIELD],
                                item[PassConstants.PASS_URL_FIELD],
                                item[PassConstants.PASS_IMAGE_FIELD]);
                            searchResultsByDatabase[PassConstants.PASS_DB].push(searchItem);
                        }
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[PassConstants.PASS_TITLE_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[PassConstants.PASS_DB].push(searchItem);
                        }
                    }                

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[PassConstants.PASS_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + PassConstants.PASS_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[PassConstants.PASS_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    // Query the Shop DB
    if (categoriesToQuery.includes("Shop Listings") || categoriesToQuery.includes("All")) {
        databaseQueryComplete[ShopConstants.SHOP_DB] = false;
        searchResultsByDatabase[ShopConstants.SHOP_DB] = [];

        let query = wixData.query(ShopConstants.SHOP_DB)
            .limit((quickSearch) ? quickSearchLimit : QUERY_LIMIT)
            .ascending(ShopConstants.SHOP_ITEM_NAME_FIELD);

        if (!quickSearch) {
            query = query.contains(ShopConstants.SHOP_ITEM_NAME_FIELD, nameSearchValue);
        }
        else {
            query = query.startsWith(ShopConstants.SHOP_ITEM_NAME_FIELD, nameSearchValue);
        }
            
        query.find()
            .then(async (results) => {
                for (; results.currentPage < results.totalPages; results = await results.next()) { // Iterate over each page of results.
                    for (let item of results.items) {
                        if (!quickSearch) {
                            let searchItem = new SearchResult(
                                item._id,
                                item[ShopConstants.SHOP_ITEM_NAME_FIELD] + " Shop Listing",
                                item[ShopConstants.SHOP_DESCRIPTION_FIELD],
                                item[ShopConstants.SHOP_URL_FIELD],
                                item[ShopConstants.SHOP_BUNDLE_IMAGE_FIELD]);
                            searchResultsByDatabase[ShopConstants.SHOP_DB].push(searchItem);
                        }
                        else {
                            // This is a quick search. We only need the name.
                            let searchItem = new SearchResult(
                                item._id,
                                item[ShopConstants.SHOP_ITEM_NAME_FIELD],
                                null,
                                null,
                                null,
                                null);
                            searchResultsByDatabase[ShopConstants.SHOP_DB].push(searchItem);
                        }
                    }                

                    if (quickSearch) { // We don't need to spend a lot of time querying if it's a quick search.
                        break;
                    }

                    if (!results.hasNext()) {
                        break;
                    }
                }
                
                // Data is now available to be displayed.
                databaseQueryComplete[ShopConstants.SHOP_DB] = true;
            })
            .catch(error => {
                console.error(error + " occurred while fetching results from the " + ShopConstants.SHOP_DB + " database.");
                searchStatus[0] = 1;
                databaseQueryComplete[ShopConstants.SHOP_DB] = true; // For now, we want to set this to true so that it doesn't prevent the rest of the search from happening.
            });
    }

    let iterationCounter = 0; // We want to abort if it takes too long. Hopefully it won't, but let's use a 30-second timer just in case.
    while(!databaseQueriesComplete(databaseQueryComplete) && iterationCounter < 60) {
        // Sleep for 1 second to avoid overwhelming the local PC.
        await GeneralFunctions.sleep(1000);
        iterationCounter++;
    }

    if (iterationCounter >= 60 && !databaseQueriesComplete(databaseQueryComplete)) {
        // Timed out.
        console.error("Timed out while trying to query the databases. Please try again.");
        searchStatus[0] = 2;
        return [];
    }

    let consolidatedSearchResults = [];
    let quickSearchNamesProcessed = [];

    for (let database in searchResultsByDatabase) {
        if (!quickSearch) {
            consolidatedSearchResults = consolidatedSearchResults.concat(searchResultsByDatabase[database]);
        }
        else {
            for (let searchResult of searchResultsByDatabase[database]) {
                if (consolidatedSearchResults.length < quickSearchLimit) {
                    if (!quickSearchNamesProcessed.includes(searchResult.name)) {
                        quickSearchNamesProcessed.push(searchResult.name);
                        consolidatedSearchResults.push(searchResult);
                    }
                }
                else {
                    break;
                }
            }

            if (consolidatedSearchResults.length >= quickSearchLimit) {
                break;
            }
        }
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

    //console.log(consolidatedSearchResults);

    return consolidatedSearchResults;
}

