import wixData from 'wix-data';
import {initialItemSetup} from 'public/ItemSetup.js';
import {SHOP_LISTINGS_SECTION, ARMOR_CUSTOMIZATION_DB, ARMOR_CUSTOMIZATION_ATTACHMENTS_DB, WEAPON_CUSTOMIZATION_DB, VEHICLE_CUSTOMIZATION_DB,
	BODY_AND_AI_CUSTOMIZATION_DB, SPARTAN_ID_CUSTOMIZATION_DB, CONSUMABLES_DB} from 'public/KeyConstants.js';
import {getLongMonthDayYearFromDate} from 'public/General.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(async function () {
	// Set the initial datetime to last Tuesday.
	var d = new Date(),
        day = d.getDay(),
        diff = (day < 2) ? (7 - 2 + day) : (day - 2); // Tuesday has value 2.

    d.setDate(d.getDate() - diff);
	d.setHours(0);
	d.setMinutes(0);
	d.setSeconds(0);

    let dateString = getLongMonthDayYearFromDate(d);

	$w("#title").text = "Items Updated Since " + dateString;

	// Set up our dateFilter.
	let dateFilter = wixData.filter().ge("apiLastUpdatedDatetime", d);

	// Update the listings for each item type.
	$w("#ArmorCoreDataset").onReady(async function() {
		await $w("#ArmorCoreDataset").setFilter(dateFilter);

		if ($w("#armorCoreListRepeater").data.length > 0) {
			$w("#armorCoreListRepeater").onItemReady(($item, itemData) => {
				$item("#armorCoreImage").fitMode = "fit";
			});
		}
		else {
			$w("#armorCoreContainer").collapse();
		}
	});

	$w("#ArmorDataset").onReady(async function() {
		await $w("#ArmorDataset").setFilter(dateFilter);
		if ($w("#armorListRepeater").data.length > 0) {
			$w("#armorListRepeater").onItemReady(($item, itemData) => {
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

	$w("#ArmorAttachmentDataset").onReady(async function() {
		await $w("#ArmorAttachmentDataset").setFilter(dateFilter);
		if ($w("#armorAttachmentListRepeater").data.length > 0) {
			$w("#armorAttachmentListRepeater").onItemReady(($item, itemData) => {
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

	$w("#WeaponCoreDataset").onReady(async function() {
		await $w("#WeaponCoreDataset").setFilter(dateFilter);
		if ($w("#weaponCoreListRepeater").data.length > 0) {
			$w("#weaponCoreListRepeater").onItemReady(($item, itemData) => {
				$item("#weaponCoreImage").fitMode = "fit";
			});
		}
		else {
			$w("#weaponCoreContainer").collapse();
		}
	});

	$w("#WeaponDataset").onReady(async function() {
		await $w("#WeaponDataset").setFilter(dateFilter);
		if ($w("#weaponListRepeater").data.length > 0) {
			$w("#weaponListRepeater").onItemReady(($item, itemData) => {
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

	$w("#VehicleCoreDataset").onReady(async function() {
		await $w("#VehicleCoreDataset").setFilter(dateFilter);
		if ($w("#vehicleCoreListRepeater").data.length > 0) {
			$w("#vehicleCoreListRepeater").onItemReady(($item, itemData) => {
				$item("#vehicleCoreImage").fitMode = "fit";
			});
		}
		else {
			$w("#vehicleCoreContainer").collapse();
		}
	});

	$w("#VehicleDataset").onReady(async function() {
		await $w("#VehicleDataset").setFilter(dateFilter);
		if ($w("#vehicleListRepeater").data.length > 0) {
			$w("#vehicleListRepeater").onItemReady(($item, itemData) => {
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

	$w("#BodyAndAIDataset").onReady(async function() {
		await $w("#BodyAndAIDataset").setFilter(dateFilter);
		if ($w("#bodyAndAIListRepeater").data.length > 0) {
			$w("#bodyAndAIListRepeater").onItemReady(($item, itemData) => {
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

	$w("#SpartanIDDataset").onReady(async function() {
		await $w("#SpartanIDDataset").setFilter(dateFilter);
		if ($w("#spartanIDListRepeater").data.length > 0) {
			$w("#spartanIDListRepeater").onItemReady(($item, itemData) => {
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
});
