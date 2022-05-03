// Filename: public/CoreSetup.js
// This code is designed to run on all Core selection pages (Armor Cores, Weapon Cores, and Vehicle Cores).

import { session } from 'wix-storage';

import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

export function coreSetup($item, itemData, customizationCategory) {
    //#region Setting image fitMode.
	$item("#image2").fitMode = "fit"; // We want the images selected to fit within the image containers.
    //#endregion

    //#region Setting button link.
    let buttonLink = ""; // The link that each button will point to.

    // These variables will contain the values of certain constants depending on which category is selected.
    let anyCoreID = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].AnyCoreId; // The ID within the Cores DB for the "Any" item.
    let socketURL = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlSockets; // The URL slug of the Sockets page.
    let coreURLParam = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlCoreParam; // The URL parameter for the Core.

    // We have two cases for the URL link.
    if (itemData._id != anyCoreID) { // Core specified
        buttonLink = socketURL + "?" + coreURLParam + "=" + itemData._id;
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