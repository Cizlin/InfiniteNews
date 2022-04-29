// Filename: public/ItemSetup.js

// TODO: Use the following renames: 
// image -> itemImage
// text15 -> sourceText
// text19 -> QualityText
// *Cores -> cores

import wixData from 'wix-data';
import * as KeyConstants from 'public/KeyConstants.js';

// This code is used to set up customization item pages.
export function initialItemSetup(customizationSection) {
	//#region Configuring image settings for all applicable images.
    $w("#itemImage").fitMode = "fixedWidth";

	if ($w("#manufacturerImage").type != "undefined") {
        $w("#manufacturerImage").fitMode = "fit";
    }

    if ($w("#releaseImage").type != "undefined") {
	    $w("#releaseImage").fitMode = "fit";
    }
    //#endregion

	
	$w("#dynamicDatasetItem").onReady( () => {
        //#region Getting current item
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem();
        //#endregion

		if ($w("#imageCreditText").id) {
			if (currentItem.imageCredit) {
				$w("#imageCreditText").text = "Image Credit: " + currentItem.imageCredit;
			}
			else {
				$w("#imageCreditText").hide();
			}
		}

        //#region Updating source text color to white and setting font size to 18 px.
        // Update the Rich Text color to white at runtime and set font-size to 18 px.
		if (customizationSection != KeyConstants.SHOP_LISTINGS_SECTION) {
			if (!$w("#sourceText").html.includes("<p>"))
			{
				$w("#sourceText").html = "<p style=\"color:white;font-size:18px\">" + $w("#sourceText").html + "</p>";
			}
			while ($w("#sourceText").html.includes("<p>"))
			{
				$w("#sourceText").html = $w("#sourceText").html.replace("<p>", "<p style=\"color:white;font-size:18px\">");
			}
		}
        //#endregion
		
        //#region Setting quality font color.
		// Set the font color of the quality.
		let colorHex; // The hexadecimal color code for the rarity.
		switch ($w("#QualityText").text.toUpperCase()) {
			case "COMMON":
				colorHex = "cdcdcd";
				break;
			case "RARE":
				colorHex = "5cc3fe";
				break;
			case "EPIC":
				colorHex = "f94ffc";
				break;
			case "LEGENDARY":
				colorHex = "e5ac2d";
				break;
			default:
				colorHex = "ffffff";
		}

		// Update the color in the HTML for the quality text box.
		while ($w("#QualityText").html.includes("color:#FFFFFF")) {
			$w("#QualityText").html = $w("#QualityText").html.replace("color:#FFFFFF", "color:#" + colorHex);
		}
        //#endregion

        //#region Checking to see if the Core text is present (i.e. we are working with Armor, Weapons, or Vehicles).
        let hasCoreText = false; // By default, we don't need to work with the Core text.

        switch (customizationSection) {
            case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
			case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
			case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
                hasCoreText = true;
        }
        //#endregion

        if (hasCoreText) {
		    //#region Initializing variables to get applicable Cores.
		    // Set cores text.
            let coreString = ""; // This string will contain a comma-separated list of all Cores to which this item can apply.

            let customizationDB = ""; // The name of the database holding these customization items.
            let coreReferenceField = "";

            // Initialize the variables with the appropriate values.
            switch (customizationSection) {
                case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
                    customizationDB = KeyConstants.ARMOR_CUSTOMIZATION_DB;
                    coreReferenceField = KeyConstants.ARMOR_CORE_REFERENCE_FIELD;
                    break; 

				case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
					customizationDB = KeyConstants.WEAPON_CUSTOMIZATION_DB;
					coreReferenceField = KeyConstants.WEAPON_CORE_REFERENCE_FIELD;
					break;

				case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
					customizationDB = KeyConstants.VEHICLE_CUSTOMIZATION_DB;
					coreReferenceField = KeyConstants.VEHICLE_CORE_REFERENCE_FIELD;
					break;

                default:
                    console.error("initialItemSetup: Failed to find matching customization section. Was given " + customizationSection);
                    return -1;
            }
            //#endregion

            //#region Updating the Cores text to show the Cores on which this item can apply.
            wixData.queryReferenced(customizationDB, currentItem._id, coreReferenceField)
                .then((results) => {
                    results.items.forEach(element => {
						console.log(element);
                        coreString += element.name + ",";
                    });

                    // Remove the final comma.
                    coreString = coreString.substr(0, coreString.length - 1);

                    $w("#cores").text = coreString;
                })
				.catch((error) => {
					console.error("Error occurred while querying " + customizationDB + ": " + error);
				});
            //#endregion
        }

		//#region Set CurrentlyAvailable icon.
        // Display the correct Currently Available Icon.
		let currentlyAvailable = currentItem.currentlyAvailable; // Get currentlyAvailable value from currentItem.

		// The value of currentlyAvailable will either be undefined or the string "false" if it isn't selected. Handle both cases here.
		if (!currentlyAvailable || currentlyAvailable == "false") {
			$w("#vectorImage1").hide(); // Hide the green check.
			$w("#vectorImage2").show(); // Show the red X.
		}
		else
		{
			$w("#vectorImage1").show(); // Show the green check.
			$w("#vectorImage2").hide(); // Hide the red X.
		}
		//#endregion

		//#region Hide the Shop Listing if it isn't necessary.
		try { // This should only exist when the Shop Listing is on the page.
			$w("#ShopDataset").onReady(function() {
				if ($w("#shopListRepeater").data.length > 0) {
					$w("#shopListRepeater").forEachItem(($item, itemData) => {
						$item("#shopBundleImage").fitMode = "fit";
					});
				}
				else {
					$w("#shopContainer").collapse();
				}
			})
		}
		catch (error) {
			console.warn("Error found: " + error);
			console.warn("This is likely because #shopContainer does not exist on this page.");
		}

		try { // This should only exist on pages that can have emblems/nameplates.
			$w("#emblemPaletteDataset").onReady(function() {
				if ($w("#emblemPaletteRepeater").data.length > 0) {
					$w("#emblemPaletteRepeater").forEachItem(($item, itemData) => {
						$item("#emblemPaletteImage").fitMode = "fit";
					});
				}
				else {
					$w("#emblemPaletteContainer").collapse();
				}
			})
		}
		catch (error) {
			console.warn("Error found: " + error);
			console.warn("This is likely because #emblemPaletteContainer does not exist on this page.");
		}

		// Populate the Kit Items repeater with the desired data or hide it if no data is available.
		try {
			$w("#kitItemDataset").onReady(async () => { 
				// If there are no Kit Items for the Kit (or other item), hide the Kit Item list and header.
				if (!($w("#kitItemRepeater").data.length > 0)) {
					//$w("#attachmentsHeader").hide();
					//$w("#listRepeater").hide();
					$w("#kitItemContainer").collapse();
				}
				else {
					// Otherwise update the customization type displayed for each attachment.
					let customizationDB = ""; // The name of the database holding these customization items.

					// Initialize the variables with the appropriate values.
					switch (customizationSection) {
						case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
							customizationDB = KeyConstants.ARMOR_CUSTOMIZATION_DB;
							break; 

						case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
							customizationDB = KeyConstants.WEAPON_CUSTOMIZATION_DB;
							break;

						/*case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
							customizationDB = KeyConstants.VEHICLE_CUSTOMIZATION_DB;
							break;*/

						default: // This shouldn't execute unless there are Kits added for other customization sections.
							console.error("initialItemSetup: Failed to find matching customization section for Kit Item repeater. Was given " + customizationSection);
							return -1;
					}

					$w("#kitItemRepeater").forEachItem(($item, itemData) => {
						$item("#kitItemImage").fitMode = "fit";
						//console.log(itemData);
						let currentItem = itemData;
						//$item("#attachmentCustomizationType").text = currentItem[ARMOR_SOCKET_REFERENCE_FIELD].name + " Attachment";
						let sourceString = "";
						wixData.queryReferenced(customizationDB, currentItem._id, "sourceTypeReference")
							.then((results) => {
								//console.log(currentAttachment.itemName);
								results.items.forEach(element => {
									sourceString += element.name + ",";
								});

								// Remove the final comma.
								sourceString = sourceString.substr(0, sourceString.length - 1);

								$item("#kitItemSourceString").text = sourceString;
							})
							.catch((error) => {
								console.error("Error occurred while querying " + customizationDB + ": " + error);
							});
					});
				}
			});
		}
		catch (error) {
			console.warn("Error found: " + error);
			console.warn("This is likely because #kitItemContainer does not exist on this page.");
		}

		// Populate the Kit Attachments repeater with the desired data or hide it if no data is available.
		try {
			$w("#kitAttachmentDataset").onReady(async () => { 
				// If there are no Kit Items for the Kit (or other item), hide the Kit Item list and header.
				if (!($w("#kitAttachmentRepeater").data.length > 0)) {
					//$w("#attachmentsHeader").hide();
					//$w("#listRepeater").hide();
					$w("#kitAttachmentContainer").collapse();
				}
				else {
					// Otherwise update the customization type displayed for each attachment.
					let customizationDB = ""; // The name of the database holding these customization items.

					// Initialize the variables with the appropriate values.
					switch (customizationSection) {
						case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
							customizationDB = KeyConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_DB;
							break;

						default: // This shouldn't execute unless there are Kits added for other customization sections.
							console.error("initialItemSetup: Failed to find matching customization section for Kit Attachment repeater. Was given " + customizationSection);
							return -1;
					}

					$w("#kitAttachmentRepeater").forEachItem(($item, itemData) => {
						$item("#kitAttachmentImage").fitMode = "fit";
						//console.log(itemData);
						let currentItem = itemData;
						$item("#kitAttachmentCustomizationType").text = "Helmet Attachment"; //TODO: Find a better way to do this in the future.
						let sourceString = "";
						wixData.queryReferenced(customizationDB, currentItem._id, "sourceTypeReference")
							.then((results) => {
								//console.log(currentAttachment.itemName);
								results.items.forEach(element => {
									sourceString += element.name + ",";
								});

								// Remove the final comma.
								sourceString = sourceString.substr(0, sourceString.length - 1);

								$item("#kitAttachmentSourceString").text = sourceString;
							})
							.catch((error) => {
								console.error("Error occurred while querying " + customizationDB + ": " + error);
							});
					});
				}
			});
		}
		catch (error) {
			console.warn("Error found: " + error);
			console.warn("This is likely because #kitAttachmentContainer does not exist on this page.");
		}
	});
}