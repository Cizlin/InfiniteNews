// Filename: public/SocketSetup.js
// This code is designed to run on all Socket pages (Armor, Weapons, Vehicles, Body & AI, and Spartan ID).

import {session} from 'wix-storage';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

// This function returns the coreID from the URL on success (or empty string if it does not exist) and -1 on failure.
export function initialSocketSetup(customizationCategory) {
    //#region Resetting session values for each filter.
    // Reset the session values for each of the filters on the item list pages.
	session.setItem(KeyConstants.QUALITY_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
    session.setItem(KeyConstants.HIDDEN_KEY, KeyConstants.DEFAULT_HIDDEN_FILTER_VALUE);
	session.setItem(KeyConstants.AVAILABLE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.RELEASE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.QUICK_SEARCH_KEY, KeyConstants.DEFAULT_QUICK_SEARCH_VALUE);
	session.setItem(KeyConstants.TIMEFRAME_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.SHOP_TYPE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
    session.setItem(KeyConstants.PASS_TYPE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);

    wixData.query(CustomizationConstants.SOURCE_TYPE_DB)
        .find()
        .then((results) => {
            results.items.forEach((value) => {
                session.setItem(value[CustomizationConstants.SOURCE_TYPE_NAME_FIELD], String(true)); // We use a default value of "true" for each data source.
                //console.log(value.name);
            })
        });
    //#endregion

    //#region Checking to see if Core filtering is necessary (i.e. we are working with Armor, Weapons, or Vehicles).
    let filterByCore = (customizationCategory in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT); // By default, we don't need to do core filtering
    //#endregion

    if (filterByCore) {
        //#region Creating and initializing variables based on customizationSection. Contains return statement.
        let query = wixLocation.query; // Needed to get URL parameters.

        let anyCoreID = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].AnyCoreId; // The core ID for the "Any" Core.
        let coreID = ""; // The core ID
        let coreName = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].DefaultCoreName; // The name of the selected Core (or All * Cores if not found.)
        let coreDB = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreDb; // The name of the core database.
        let coreNameField = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;

        // The name of the Core reference field in the Socket DB.
        let coreReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketCoreReferenceField;

        let filter = wixData.filter(); // The base filter to be used on the data.

        // We want to use a temporary Core ID since we are checking to see if the URL param is undefined.
        let tempCoreID = query[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlCoreParam];
        //#endregion

        //#region Filtering by Core if present in URL parameters.
        // See if we got a Core from the URL query and filter if so.
        if (tempCoreID) {
            coreID = tempCoreID;
            $w("#dynamicDataset").setFilter(
                filter.hasSome(coreReferenceField, [coreID, anyCoreID])
            );
        }
        //#endregion

        //#region Setting Core Name display.
        wixData.query(coreDB)
            .eq("_id", coreID)
            .find()
            .then( (results) => {
                //console.log(results);
                if(results.items.length > 0) {
                    let firstItem = results.items[0]; // The matching item
                    coreName = firstItem[coreNameField];
                }

                $w("#coreText").text = coreName; // The name of the matching item
            });
        //#endregion

        return coreID;
    }
}

export function socketItemSetup($item, itemData, customizationCategory, coreID) {
    //#region Fitting images within containers...
    // Fit the repeater images to avoid unnecessary cutoff.
    $item("#image2").fitMode = "fit";
    //#endregion

    const IS_CORE_CATEGORY = (customizationCategory in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT);

    //#region Declaring and initializing button link variables. Contains return statement.
    let buttonLink = ""; // The URL to which each button points.
    let anySocketID = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].AnySocketId; // The ID of the "Any" socket.
    let customizationURL = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlCustomization; // The customization URL slug.
    let coreURLParam = (IS_CORE_CATEGORY) ? CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlCoreParam : null; // The URL parameter for the Core.
    let socketURLParam = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlSocketParam; // The URL paramter for the socket.
    //#endregion

    //#region Setting the button link value...
    // We have four cases for the URL link.
    if (coreID != "" && itemData._id != anySocketID) { // Core and socket specified
        buttonLink = customizationURL 
            + "?" + coreURLParam + "=" + coreID
            + "&" + socketURLParam + "=" + itemData._id;
    }
    else if (coreID != "" && itemData._id == anySocketID) { // Core only specified
        buttonLink = customizationURL 
            + "?" + coreURLParam + "=" + coreID;
    }
    else if (coreID == "" && itemData._id != anySocketID) { // Socket only specified
        buttonLink = customizationURL
            + "?" + socketURLParam + "=" + itemData._id;
    }
    else { // Nothing specified.
        buttonLink = customizationURL;
    }

    // Set the button's link.
    $item("#button1").link = buttonLink;
    //#endregion

    //#region Resetting pagination index on button click
    // Reset the pagination index for the destination page when a repeater button is clicked.
    $item("#button1").onClick((event) => {
        let destinationPaginationKey = buttonLink + "_paginationIndex";
        console.log("Resetting page number for pagination Key: " + destinationPaginationKey);
        session.setItem(destinationPaginationKey, 1);
    });
    //#endregion
}