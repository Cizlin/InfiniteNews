import wixData from 'wix-data';
import {initialItemSetup} from 'public/ItemSetup.js';
import {SHOP_LISTINGS_SECTION, ARMOR_CUSTOMIZATION_DB, ARMOR_CUSTOMIZATION_ATTACHMENTS_DB, WEAPON_CUSTOMIZATION_DB, VEHICLE_CUSTOMIZATION_DB,
	BODY_AND_AI_CUSTOMIZATION_DB, SPARTAN_ID_CUSTOMIZATION_DB, CONSUMABLES_DB} from 'public/KeyConstants.js';
import {getLongMonthDayYearFromDate} from 'public/General.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	initialItemSetup(SHOP_LISTINGS_SECTION);

	$w("#dynamicDatasetItem").onReady(() => {
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem();

		console.log("Current item", currentItem);

		let dateArray = currentItem.availableDateArray;
		let priceArray = currentItem.priceHistoryArray;

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
			$item("#date").text = " - " + getLongMonthDayYearFromDate(date) + ": " + price + " Credits";//((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
			console.log($item("#date").text);
		});

		//$w("#armorContainer").expand()
		//	.then(function() { 
		//		$w("#armorContainer").show()
		//			.then(function() {
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
	});
});
