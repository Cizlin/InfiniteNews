// Filename: public/SocketSetup.js
// This code is designed to run on all Socket pages (Armor, Weapons, Vehicles, Body & AI, and Spartan ID).

import {session} from 'wix-storage';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import * as KeyConstants from 'public/KeyConstants.js';
import * as URLConstants from 'public/URLConstants.js';

// TODO: Set Core text item name to coreText.

// This function returns the coreID from the URL on success (or empty string if it does not exist) and -1 on failure.
export function initialSocketSetup(customizationSection) {
    //#region Resetting session values for each filter.
    // Reset the session values for each of the filters on the item list pages.
	session.setItem(KeyConstants.QUALITY_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.HIDDEN_KEY, "No Hidden");
	session.setItem(KeyConstants.AVAILABLE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.RELEASE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.QUICK_SEARCH_KEY, "");
	session.setItem(KeyConstants.TIMEFRAME_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
	session.setItem(KeyConstants.SHOP_TYPE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);
    session.setItem(KeyConstants.PASS_TYPE_KEY, KeyConstants.DEFAULT_FILTER_VALUE);

    wixData.query("Sources")
        .find()
        .then((results) => {
            results.items.forEach((value) => {
                session.setItem(value.name, String(true)); // We use a default value of "true" for each data source.
                //console.log(value.name);
            })
        });
    //#endregion

    //#region Checking to see if Core filtering is necessary (i.e. we are working with Armor, Weapons, or Vehicles).
    let filterByCore = false; // By default, we don't need to do core filtering

    switch (customizationSection) {
        case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
        case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
        case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
            filterByCore = true;
    }
    //#endregion

    if (filterByCore) {

        //#region Creating and initializing variables based on customizationSection. Contains return statement.
        let query = wixLocation.query; // Needed to get URL parameters.

        let anyCoreID = ""; // The core ID for the "Any" Core.
        let coreID = ""; // The core ID
        let coreName = ""; // The name of the selected Core (or All * Cores if not found.)
        let coreDB = ""; // The name of the core database.
        let coreReferenceField = ""; // The name of the Core reference field in the Socket DB.

        let filter = wixData.filter(); // The base filter to be used on the data.

        let tempCoreID; // We want to use a temporary Core ID since we are checking to see if the URL param is undefined.

        switch (customizationSection) {
            case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
                tempCoreID = query[URLConstants.URL_ARMOR_CORE_PARAM];
                anyCoreID = KeyConstants.ANY_ARMOR_CORE_ID;
                coreName = "All Armor Cores";
                coreDB = KeyConstants.ARMOR_CORE_DB;
                coreReferenceField = KeyConstants.ARMOR_SOCKET_CORE_REFERENCE_FIELD;
                break; 

            case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
                tempCoreID = query[URLConstants.URL_WEAPON_CORE_PARAM];
                anyCoreID = KeyConstants.ANY_WEAPON_CORE_ID;
                coreName = "All Weapon Cores";
                coreDB = KeyConstants.WEAPON_CORE_DB;
                coreReferenceField = KeyConstants.WEAPON_SOCKET_CORE_REFERENCE_FIELD;
                break; 

            case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
                tempCoreID = query[URLConstants.URL_VEHICLE_CORE_PARAM];
                anyCoreID = KeyConstants.ANY_VEHICLE_CORE_ID;
                coreName = "All Vehicle Cores";
                coreDB = KeyConstants.VEHICLE_CORE_DB;
                coreReferenceField = KeyConstants.VEHICLE_SOCKET_CORE_REFERENCE_FIELD;
                break; 

            default:
                console.error("initialSocketSetup: Failed to find matching customization section. Was given " + customizationSection);
                return -1;
        }
        //#endregion

        //#region Filtering by Core if present in URL parameters.
        // See if we got a Core from the URL query and filter if so.
        if (typeof(tempCoreID) != "undefined") {
            coreID = tempCoreID;
            $w("#dynamicDataset").setFilter(
                filter.hasSome(coreReferenceField, [coreID])
                .or(filter.hasSome(coreReferenceField, [anyCoreID]))
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
                    coreName = firstItem.name;
                }

                $w("#coreText").text = coreName; // The name of the matching item
            });
        //#endregion

        return coreID;
    }
}

export function socketItemSetup($item, itemData, customizationSection, coreID) {
    //#region Fitting images within containers...
    // Fit the repeater images to avoid unnecessary cutoff.
    $item("#image2").fitMode = "fit";
    //#endregion

    //#region Declaring and initializing button link variables. Contains return statement.
    let buttonLink = ""; // The URL to which each button points.
    let anySocketID = ""; // The ID of the "Any" socket.
    let customizationURL = ""; // The customization URL slug.
    let coreURLParam = ""; // The URL parameter for the Core.
    let socketURLParam = ""; // The URL paramter for the socket.

    switch (customizationSection) {
        case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
            anySocketID = KeyConstants.ANY_ARMOR_SOCKET_ID;
            customizationURL = URLConstants.URL_ARMOR_CUSTOMIZATION;
            coreURLParam = URLConstants.URL_ARMOR_CORE_PARAM;
            socketURLParam = URLConstants.URL_ARMOR_SOCKET_PARAM;
            break;

        case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
            anySocketID = KeyConstants.ANY_WEAPON_SOCKET_ID;
            customizationURL = URLConstants.URL_WEAPON_CUSTOMIZATION;
            coreURLParam = URLConstants.URL_WEAPON_CORE_PARAM;
            socketURLParam = URLConstants.URL_WEAPON_SOCKET_PARAM;
            break;

        case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
            anySocketID = KeyConstants.ANY_VEHICLE_SOCKET_ID;
            customizationURL = URLConstants.URL_VEHICLE_CUSTOMIZATION;
            coreURLParam = URLConstants.URL_VEHICLE_CORE_PARAM;
            socketURLParam = URLConstants.URL_VEHICLE_SOCKET_PARAM;
            break;

        case KeyConstants.BODY_AND_AI_CUSTOMIZATION_SECTION:
            anySocketID = KeyConstants.ANY_BODY_AND_AI_SOCKET_ID;
            customizationURL = URLConstants.URL_BODY_AND_AI_CUSTOMIZATION;
            coreURLParam = undefined;
            socketURLParam = URLConstants.URL_BODY_AND_AI_SOCKET_PARAM;
            break;    

        case KeyConstants.SPARTAN_ID_CUSTOMIZATION_SECTION:
            anySocketID = KeyConstants.ANY_SPARTAN_ID_SOCKET_ID;
            customizationURL = URLConstants.URL_SPARTAN_ID_CUSTOMIZATION;
            coreURLParam = undefined;
            socketURLParam = URLConstants.URL_SPARTAN_ID_SOCKET_PARAM;
            break;  

        default: 
            console.error("socketItemSetup: Failed to find matching customization section. Was given " + customizationSection);
            return;
    }
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