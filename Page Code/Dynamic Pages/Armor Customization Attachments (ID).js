import wixData from 'wix-data';
import {initialItemSetup} from 'public/ItemSetup.js';
import {ARMOR_ATTACHMENT_CUSTOMIZATION_SECTION, ARMOR_CUSTOMIZATION_DB, ARMOR_CUSTOMIZATION_ATTACHMENTS_REFERENCE_FIELD} from 'public/KeyConstants.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	initialItemSetup(ARMOR_ATTACHMENT_CUSTOMIZATION_SECTION);

	$w("#hideHiddenButton").hide();

	// We need to get the customization type of the parent item to update the view.
	let currentItem = $w("#dynamicDatasetItem").getCurrentItem();
	let baseFilter = wixData.filter().hasSome(ARMOR_CUSTOMIZATION_ATTACHMENTS_REFERENCE_FIELD, [currentItem._id]);

	$w("#dataset1").onReady(function () {
		$w("#listRepeater").onItemReady(($item, itemData) => {
			$item("#armorImage").fitMode = "fit";
			
			let currentAttachment = itemData;
			let sourceString = "";
			wixData.queryReferenced(ARMOR_CUSTOMIZATION_DB, currentAttachment._id, "sourceTypeReference")
				.then((results) => {
					results.items.forEach(element => {
						sourceString += element.name + ", ";
					});

					// Remove the final comma.
					sourceString = sourceString.substr(0, sourceString.length - 2);

					$item("#itemSource").text = sourceString;
				})
				.catch((error) => {
					console.error("Error occurred while querying " + ARMOR_CUSTOMIZATION_DB + ": " + error);
				});
		});

		$w("#showHiddenButton").onClick(function() {
				// We don't really want to filter on anything other than the parent item. We actually want to remove the existing filters.
				let showHiddenFilter = baseFilter; 
				$w("#dataset1").setFilter(showHiddenFilter)
					.then(() => {
						$w("#showHiddenButton").hide();
						$w("#hideHiddenButton").show();
					});
			});

			$w("#hideHiddenButton").onClick(function () {
				// If the item isn't hidden and belongs on this parent item, show it.
				let hideHiddenFilter = baseFilter.ne("hidden", true); 
				$w("#dataset1").setFilter(hideHiddenFilter)
					.then(() => {
						$w("#hideHiddenButton").hide();
						$w("#showHiddenButton").show();
					});
			});
	});
});
