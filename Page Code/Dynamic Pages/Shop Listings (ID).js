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

						if ("CustomizationEffectVideoField" in CATEGORY_SPECIFIC_VARS) {
							$item("#" + TYPE + "EffectVideoPlayer").collapse();
							$item("#" + TYPE + "EffectVideoPlayer").hide();
						}

						let currentItem = itemData;

						if ("CustomizationEffectVideoField" in CATEGORY_SPECIFIC_VARS && 
							currentItem[CATEGORY_SPECIFIC_VARS.CustomizationEffectVideoField]) {

							console.log("Showing video and hiding image.")
							$item("#" + TYPE + "EffectVideoPlayer").src = currentItem[CATEGORY_SPECIFIC_VARS.CustomizationEffectVideoField];
							$item("#" + TYPE + "Image").collapse();
							$item("#" + TYPE + "Image").hide();
							$item("#" + TYPE + "EffectVideoPlayer").expand();
							$item("#" + TYPE + "EffectVideoPlayer").show();
						}

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
	});
});
