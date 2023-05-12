// Filename: public/ItemSetup.js

import wixData from 'wix-data';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

// This code is used to set up customization item pages.
export function initialItemSetup(customizationCategory, isCore = false) {
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
			const IMAGE_CREDIT_FIELD = (!isCore) ? CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationImageCreditField : null;
			if (currentItem[IMAGE_CREDIT_FIELD]) {
				$w("#imageCreditText").text = "Image Credit: " + currentItem[IMAGE_CREDIT_FIELD];
			}
			else {
				$w("#imageCreditText").hide();
			}
		}

        //#region Updating source text color to white and setting font size to 18 px.
        // Update the Rich Text color to white at runtime and set font-size to 18 px.
		if (CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(customizationCategory)) {
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
		let hasCoreText = (customizationCategory in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT) && !isCore;
        //#endregion

        if (hasCoreText) {
		    //#region Initializing variables to get applicable Cores.
		    // Set cores text.
            let coreString = ""; // This string will contain a comma-separated list of all Cores to which this item can apply.

			// The name of the database holding these customization items.
			let customizationDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
			// The reference field to the cores in the customization DB.
			let coreReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
			// The name field in the core DB.
			let coreNameField = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;
            //#endregion

            //#region Updating the Cores text to show the Cores on which this item can apply.
            wixData.queryReferenced(customizationDB, currentItem._id, coreReferenceField)
                .then((results) => {
                    results.items.forEach(element => {
						console.log(element);
						coreString += element[coreNameField] + ",";
                    });

                    // Remove the final comma.
                    coreString = coreString.substr(0, coreString.length - 1);

                    $w("#cores").text = coreString;
                })
				.catch((error) => {
					console.error("Error occurred while querying " + customizationDB + ": " + error);
				});

			if ($w("#originalCoreText").id) {
				console.log("Original Cores Text on this page.", $w("#originalCoreText").id);

				let originalCoreReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationOriginalCoresField;
				let originalCoreString = "";

				wixData.queryReferenced(customizationDB, currentItem._id, originalCoreReferenceField)
					.then((results) => {
						if (results.items.length > 0) {
							console.log("Original cores found...");
							results.items.forEach(element => {
								console.log(element);
								originalCoreString += element[coreNameField] + ",";
							});

							// Remove the final comma.
							originalCoreString = originalCoreString.substr(0, originalCoreString.length - 1);

							$w("#originalCoreText").text = originalCoreString;
						}
						else {
							$w("#originalCoreContainer").collapse();
							$w("#originalCoreContainer").hide();
						}
					})
					.catch((error) => {
						console.error("Error occurred while querying " + customizationDB + ": " + error);
					});
			}
            //#endregion
        }

		//#region Set CurrentlyAvailable icon.
        // Display the correct Currently Available Icon.
		let currentlyAvailableField = null;

		if (CustomizationConstants.IS_CUSTOMIZATION_ARRAY.includes(customizationCategory)) {
			currentlyAvailableField = (!isCore) ?
				CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField
				: CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreCurrentlyAvailableField;
		}
		else {
			switch (customizationCategory) {
				case ConsumablesConstants.CONSUMABLES_KEY:
					currentlyAvailableField = ConsumablesConstants.CONSUMABLES_CURRENTLY_AVAILABLE_FIELD;
					break;

				case ShopConstants.SHOP_KEY:
					currentlyAvailableField = ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD;
					break;

				case PassConstants.PASS_KEY:
					currentlyAvailableField = PassConstants.PASS_CURRENTLY_AVAILABLE_FIELD;
					break;

				case CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY:
					currentlyAvailableField = CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CURRENTLY_AVAILABLE_FIELD;
					break;

				default:
					console.warn("Could not find currentlyAvailableField for " + customizationCategory);
					break;
			}
        }

		let currentlyAvailable = currentItem[currentlyAvailableField]; // Get currentlyAvailable value from currentItem.

		if (customizationCategory === ShopConstants.SHOP_KEY) {
			currentlyAvailable = currentItem[ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD] || currentlyAvailable; // If this bundle is available through customization menus, it is also valid.
		}

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
						let emblemPaletteImageMapping = itemData[CustomizationConstants.EMBLEM_PALETTE_IMAGE_MAPPING_FIELD];
						let itemWaypointId = currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField];

						try {
							if (customizationCategory != SpartanIdConstants.SPARTAN_ID_KEY) { // If we're working with an Emblem.
								let matches = itemWaypointId.match(/-(\w+)$/);

								if (matches.length > 0) {
									let commonIdString = matches[0];
									for (let waypointId in emblemPaletteImageMapping) {
										if (waypointId.includes(commonIdString)) {
											$item("#emblemPaletteImage").src = emblemPaletteImageMapping[waypointId].Emblem.URL;
										}
									}
								}
							}
							else { // If we're working with a Nameplate.
								$item("#emblemPaletteImage").src = emblemPaletteImageMapping[itemWaypointId].Emblem.URL;
								$item("#nameplateBackgroundImage").src = emblemPaletteImageMapping[itemWaypointId].Nameplate.URL;

								// Change the text color to match the one specified in the API.
								while (!$item("#emblemPaletteName").html.includes("color:" + emblemPaletteImageMapping[itemWaypointId].TextColor)) {
									$item("#emblemPaletteName").html = $item("#emblemPaletteName").html.replace("color:#FFFFFF", "color:" + emblemPaletteImageMapping[itemWaypointId].TextColor);
								}

								while (!$item("#emblemPaletteType").html.includes("color:" + emblemPaletteImageMapping[itemWaypointId].TextColor)) {
									console.log("Updating Emblem Palette text color");
									$item("#emblemPaletteType").html = $item("#emblemPaletteType").html.replace("color:#FFFFFF", "color:" + emblemPaletteImageMapping[itemWaypointId].TextColor);
								}
							}
						}
						catch (error) {
							console.warn("Unable to properly set images due to " + error + ". Using fallback images.");
							$item("#emblemPaletteImage").src = itemData[CustomizationConstants.EMBLEM_PALETTE_IMAGE_FIELD];
							$item("#nameplateBackgroundImage").hide();
						}

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
					// The name of the database holding these customization items.
					let customizationDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;

					// The source type reference field.
					let sourceTypeReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;

					$w("#kitItemRepeater").forEachItem(($item, itemData) => {
						$item("#kitItemImage").fitMode = "fit";
						//console.log(itemData);
						let currentItem = itemData;
						//$item("#attachmentCustomizationType").text = currentItem[ARMOR_SOCKET_REFERENCE_FIELD].name + " Attachment";
						let sourceString = "";
						wixData.queryReferenced(customizationDB, currentItem._id, sourceTypeReferenceField)
							.then((results) => {
								//console.log(currentAttachment.itemName);
								results.items.forEach(element => {
									sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ",";
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
					const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].AttachmentKey;
					// The name of the database holding these customization items.
					let customizationDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;

					// The source type reference field.
					let sourceTypeReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;

					$w("#kitAttachmentRepeater").forEachItem(($item, itemData) => {
						$item("#kitAttachmentImage").fitMode = "fit";
						//console.log(itemData);
						let currentItem = itemData;
						//$item("#kitAttachmentCustomizationType").text = "Helmet Attachment"; //TODO: Find a better way to do this in the future.
						let sourceString = "";
						wixData.queryReferenced(customizationDB, currentItem._id, sourceTypeReferenceField)
							.then((results) => {
								//console.log(currentAttachment.itemName);
								results.items.forEach(element => {
									sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ",";
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
