import wixData from 'wix-data';
import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as GeneralFunctions from 'public/General.js';

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

$w.onReady(function () {
	ItemSetupFunctions.initialItemSetup(ShopConstants.SHOP_KEY);

	$w("#dynamicDatasetItem").onReady(() => {
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem();

		console.log("Current item", currentItem);

		let dateArray = currentItem[ShopConstants.SHOP_AVAILABLE_DATE_ARRAY_FIELD];
		let priceArray = currentItem[ShopConstants.SHOP_PRICE_HISTORY_ARRAY_FIELD];

		let dateArrayWithIds = [];

		for (let i = 0; i < 5 && i < dateArray.length && i < priceArray.length; ++i) {
			dateArrayWithIds.push({
				_id: i.toString(),
				date: dateArray[i],
				price: priceArray[i]
			});
		}

		$w("#numAvailabilitiesText").text = "This Listing has been sold " + dateArray.length + " time" + ((dateArray.length == 1) ? "" : "s") + ".";

		$w('#dateRepeater').data = dateArrayWithIds;

		$w("#dateRepeater").onItemReady( ($item, itemData, index) => { 
			let date = new Date(itemData.date);
			let price = itemData.price;
			$item("#date").text = " - " + GeneralFunctions.getLongMonthDayYearFromDate(date) + ": " + price + " Credits";
			console.log($item("#date").text);
		});

		// We have a number of datasets, list repeaters, etc. Each category of items uses the same prefix, save for an occasional capital first letter.
		// We can just use a loop to apply the same logic to all UI element groups, provided we are careful with our naming convention.
		const TYPE_DICT = {
			"armor": ArmorConstants.ARMOR_KEY,
			"armorAttachment": ArmorConstants.ARMOR_ATTACHMENT_KEY,
			"weapon": WeaponConstants.WEAPON_KEY,
			"vehicle": VehicleConstants.VEHICLE_KEY,
			"bodyAndAI": BodyAndAiConstants.BODY_AND_AI_KEY,
			"spartanID": SpartanIdConstants.SPARTAN_ID_KEY,
			"consumable": ConsumablesConstants.CONSUMABLES_KEY
		};

		for (const TYPE in TYPE_DICT) {
			let categoryIsConsumable = null; // If the category we're working with is for consumables.

			if (TYPE_DICT[TYPE] in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS) {
				categoryIsConsumable = false;
			}
			else if (TYPE_DICT[TYPE] in ConsumablesConstants.CONSUMABLES_CATEGORY_SPECIFIC_VARS) {
				categoryIsConsumable = true;
			}
			else {
				console.error("Invalid type configuration in the Shop Listings (ID) TYPE_DICT: ", TYPE, TYPE_DICT[TYPE]);
				return;
			}

			const CATEGORY_KEYWORD = (categoryIsConsumable) ? "Consumables" : "Customization";
			// Consumables CATEGORY_SPECIFIC_VARS dicts use Consumables instead of Customization in their keys.

			const CATEGORY_SPECIFIC_VARS = (categoryIsConsumable) ? ConsumablesConstants.CONSUMABLES_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]] :
				CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]];
			
			const CAPITAL_FIRST_LETTER_TYPE = TYPE.charAt(0).toUpperCase() + TYPE.slice(1);
			$w("#" + CAPITAL_FIRST_LETTER_TYPE + "Dataset").onReady(function () {
				if ($w("#" + TYPE + "ListRepeater").data.length > 0) {
					$w("#" + TYPE + "ListRepeater").forEachItem(($item, itemData) => {
						$item("#" + TYPE + "Image").fitMode = "fit";

						let currentItem = itemData;
						let sourceString = "";
						wixData.queryReferenced(CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "Db"], currentItem._id, CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "SourceTypeField"])
							.then((results) => {
								results.items.forEach(element => {
									sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ",";
								});

								// Remove the final comma.
								sourceString = sourceString.substr(0, sourceString.length - 1);

								$item("#" + TYPE + "Source").text = sourceString;
							})
							.catch((error) => {
								console.error("Error occurred while querying " + CATEGORY_SPECIFIC_VARS[CATEGORY_KEYWORD + "Db"] + ": " + error);
							});
					});
				}
				else {
					$w("#" + TYPE + "Container").collapse();
				}
			});
		}

		/*
		$w("#ArmorDataset").onReady(function() {
			if ($w("#armorListRepeater").data.length > 0) {
				$w("#armorListRepeater").forEachItem(($item, itemData) => {
					$item("#armorImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(ARMOR_CUSTOMIZATION_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#armorSource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + ARMOR_CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#armorContainer").collapse();
			}
		});

		$w("#ArmorAttachmentDataset").onReady(function() {
			if ($w("#armorAttachmentListRepeater").data.length > 0) {
				$w("#armorAttachmentListRepeater").forEachItem(($item, itemData) => {
					$item("#armorAttachmentImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(ARMOR_CUSTOMIZATION_ATTACHMENTS_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#attachmentSourceText").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + ARMOR_CUSTOMIZATION_ATTACHMENTS_DB + ": " + error);
						});
				});
			}
			else {
				$w("#armorAttachmentContainer").collapse();
			}
		});

		$w("#WeaponDataset").onReady(function() {
			if ($w("#weaponListRepeater").data.length > 0) {
				$w("#weaponListRepeater").forEachItem(($item, itemData) => {
					$item("#weaponImage").fitMode = "fit";
					
					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(WEAPON_CUSTOMIZATION_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#weaponSource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + WEAPON_CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#weaponContainer").collapse();
			}
		});

		$w("#VehicleDataset").onReady(function() {
			if ($w("#vehicleListRepeater").data.length > 0) {
				$w("#vehicleListRepeater").forEachItem(($item, itemData) => {
					$item("#vehicleImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(VEHICLE_CUSTOMIZATION_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#vehicleSource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + VEHICLE_CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#vehicleContainer").collapse();
			}
		});

		$w("#BodyAndAIDataset").onReady(function() {
			if ($w("#bodyAndAIListRepeater").data.length > 0) {
				$w("#bodyAndAIListRepeater").forEachItem(($item, itemData) => {
					$item("#bodyAndAIImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(BODY_AND_AI_CUSTOMIZATION_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#bodyAndAISource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + BODY_AND_AI_CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#bodyAndAIContainer").collapse();
			}
		});

		$w("#SpartanIDDataset").onReady(function() {
			if ($w("#spartanIDListRepeater").data.length > 0) {
				$w("#spartanIDListRepeater").forEachItem(($item, itemData) => {
					$item("#spartanIDImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(SPARTAN_ID_CUSTOMIZATION_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#spartanIDSource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + SPARTAN_ID_CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#spartanIDContainer").collapse();
			}
		});

		$w("#ConsumableDataset").onReady(function() {
			if ($w("#consumableListRepeater").data.length > 0) {
				$w("#consumableListRepeater").forEachItem(($item, itemData) => {
					$item("#consumableImage").fitMode = "fit";

					let currentItem = itemData;
					let sourceString = "";
					wixData.queryReferenced(CONSUMABLES_DB, currentItem._id, "sourceTypeReference")
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element.name + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#consumableSource").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + CONSUMABLES_DB + ": " + error);
						});
				});
			}
			else {
				$w("#consumableContainer").collapse();
			}
		});
		*/
	});
});
