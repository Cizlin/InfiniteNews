import wixData from 'wix-data';

import * as GeneralFunctions from 'public/General.js';

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

$w.onReady(async function () {
	// Set the initial datetime to last Tuesday.
	const RESET_DAY_NUM = 2; // Tuesday has value 2.
	var d = new Date(),
        day = d.getDay(),
		diff = (day < RESET_DAY_NUM) ? (7 - RESET_DAY_NUM + day) : (day - RESET_DAY_NUM);

    d.setDate(d.getDate() - diff);
	d.setHours(0);
	d.setMinutes(0);
	d.setSeconds(0);

    let dateString = GeneralFunctions.getLongMonthDayYearFromDate(d);

	$w("#title").text = "Items Updated Since " + dateString;

	// Set up our dateFilter.
	let dateFilter = wixData.filter().ge("apiLastUpdatedDatetime", d);

	// We can iterate through each of these types, with special processing done for types with Cores and types with Attachments.
	let TYPE_DICT = {
		"armor": ArmorConstants.ARMOR_KEY,
		"weapon": WeaponConstants.WEAPON_KEY,
		"vehicle": VehicleConstants.VEHICLE_KEY,
		"bodyAndAI": BodyAndAiConstants.BODY_AND_AI_KEY,
		"spartanID": SpartanIdConstants.SPARTAN_ID_KEY
	};

	for (const TYPE in TYPE_DICT) {
		const TYPE_WITH_CAPITAL_FIRST_LETTER = TYPE.charAt(0).toUpperCase() + TYPE.slice(1);

		// Update the listings for each item type.
		if (CustomizationConstants.HAS_CORE_ARRAY.includes(TYPE_DICT[TYPE])) { // If we have cores.
			$w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "CoreDataset").onReady(async function () {
				await $w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "CoreDataset").setFilter(dateFilter);

				if ($w("#" + TYPE + "CoreListRepeater").data.length > 0) {
					$w("#" + TYPE + "CoreListRepeater").onItemReady(($item, itemData) => {
						$item("#" + TYPE + "CoreImage").fitMode = "fit";
					});
				}
				else {
					$w("#" + TYPE + "CoreContainer").collapse();
				}
			});
        }

		$w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "Dataset").onReady(async function () {
			await $w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "Dataset").setFilter(dateFilter);
			if ($w("#" + TYPE + "ListRepeater").data.length > 0) {
				$w("#" + TYPE + "ListRepeater").onItemReady(($item, itemData) => {
					$item("#" + TYPE + "Image").fitMode = "fit";

					if ("CustomizationEffectVideoField" in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]]) {
						$item("#" + TYPE + "EffectVideoPlayer").collapse();
						$item("#" + TYPE + "EffectVideoPlayer").hide();
					}

					let currentItem = itemData;

					if ("CustomizationEffectVideoField" in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]] && 
						currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]].CustomizationEffectVideoField]) {
							
						console.log("Showing video and hiding image.")
						$item("#" + TYPE + "Image").collapse();
						$item("#" + TYPE + "Image").hide();
						$item("#" + TYPE + "EffectVideoPlayer").src = currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]].CustomizationEffectVideoField];
						$item("#" + TYPE + "EffectVideoPlayer").expand();
						$item("#" + TYPE + "EffectVideoPlayer").show();
					}

					let sourceString = "";

					const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]].CustomizationDb;
					const SOURCE_TYPE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]].CustomizationSourceTypeField;
					wixData.queryReferenced(CUSTOMIZATION_DB, currentItem._id, SOURCE_TYPE_FIELD)
						.then((results) => {
							results.items.forEach(element => {
								sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ",";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 1);

							$item("#" + TYPE + "Source").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + CUSTOMIZATION_DB + ": " + error);
						});
				});
			}
			else {
				$w("#" + TYPE + "Container").collapse();
			}
		});

		if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(TYPE_DICT[TYPE])) {
			$w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "AttachmentDataset").onReady(async function () {
				await $w("#" + TYPE_WITH_CAPITAL_FIRST_LETTER + "AttachmentDataset").setFilter(dateFilter);
				if ($w("#" + TYPE + "AttachmentListRepeater").data.length > 0) {
					$w("#" + TYPE + "AttachmentListRepeater").onItemReady(($item, itemData) => {
						$item("#" + TYPE + "AttachmentImage").fitMode = "fit";

						let currentItem = itemData;
						let sourceString = "";
						const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[TYPE_DICT[TYPE]].AttachmentKey;
						const ATTACHMENT_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;
						const SOURCE_TYPE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationSourceTypeField;

						wixData.queryReferenced(ATTACHMENT_DB, currentItem._id, SOURCE_TYPE_FIELD)
							.then((results) => {
								results.items.forEach(element => {
									sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ",";
								});

								// Remove the final comma.
								sourceString = sourceString.substr(0, sourceString.length - 1);

								$item("#attachmentSourceText").text = sourceString;
							})
							.catch((error) => {
								console.error("Error occurred while querying " + ATTACHMENT_DB + ": " + error);
							});
					});
				}
				else {
					$w("#" + TYPE + "AttachmentContainer").collapse();
				}
			});
		}
    }
});
