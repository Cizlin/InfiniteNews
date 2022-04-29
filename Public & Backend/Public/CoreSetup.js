// Filename: public/CoreSetup.js
// This code is designed to run on all Core selection pages (Armor Cores, Weapon Cores, and Vehicle Cores).

import {session} from 'wix-storage';
import * as KeyConstants from 'public/KeyConstants.js';
import * as URLConstants from 'public/URLConstants.js';

// TODO: On each Core page, rename:
// - button2 to coreDetailsButton
// - text16 to coreDescription
// - button1 to coreButton

export function coreSetup($item, itemData, customizationSection) {
    //#region Setting image fitMode.
	$item("#image2").fitMode = "fit"; // We want the images selected to fit within the image containers.
    //#endregion

    //#region Setting button link.
    let buttonLink = ""; // The link that each button will point to.

    // These variables will contain the values of certain constants depending on whether Armor, Weapon, or Vehicle is selected.
    let anyCoreID; // The ID within the Cores DB for the "Any" item.
    let socketURL; // The URL slug of the Sockets page.
    let coreURLParam; // The URL parameter for the Core.

    switch (customizationSection) {
        case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
            anyCoreID = KeyConstants.ANY_ARMOR_CORE_ID;
            socketURL = URLConstants.URL_ARMOR_SOCKETS;
            coreURLParam = URLConstants.URL_ARMOR_CORE_PARAM;
            break; 

        case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
            anyCoreID = KeyConstants.ANY_WEAPON_CORE_ID;
            socketURL = URLConstants.URL_WEAPON_SOCKETS;
            coreURLParam = URLConstants.URL_WEAPON_CORE_PARAM;
            break; 
        
        case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
            anyCoreID = KeyConstants.ANY_VEHICLE_CORE_ID;
            socketURL = URLConstants.URL_VEHICLE_SOCKETS;
            coreURLParam = URLConstants.URL_VEHICLE_CORE_PARAM;
            break; 
            
        default:
            console.error("coreSetup: Failed to find matching customization section. Was given " + customizationSection);
            return;
    }

    // We have two cases for the URL link.
    if (itemData._id != anyCoreID) { // Armor Core specified
        buttonLink = socketURL 
            + "?" + coreURLParam + "=" + itemData._id;
    }
    else { // Nothing specified.
        buttonLink = socketURL;

        // Hide the Core Details and change the text for the Any Core selection.
        $item("#coreDetailsButton").hide();
        $item("#coreDescription").text = "Select for All Cores";
    }

    // Set the button's link.
    $item("#coreButton").link = buttonLink;
    //#endregion

    //#region Adding handler to reset pagination index for destination page when Core is selected.
    // Reset the pagination index for the destination page when a repeater button is clicked.
    $item("#coreButton").onClick((event) => {
        let destinationPaginationKey = buttonLink + "_paginationIndex";
        console.log("Resetting page number for pagination Key: " + destinationPaginationKey);
        session.setItem(destinationPaginationKey, 1);
    });
    //#endregion
}