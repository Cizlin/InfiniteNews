import wixData from 'wix-data';
import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	const CUSTOMIZATION_CATEGORY = ArmorConstants.ARMOR_ATTACHMENT_KEY;
	ItemSetupFunctions.initialItemSetup(CUSTOMIZATION_CATEGORY);

	const PARENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].ParentKey;

	$w("#hideHiddenButton").hide();

	// We need to get the customization type of the parent item to update the view.
	let currentItem = $w("#dynamicDatasetItem").getCurrentItem();
	const ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[PARENT_KEY].CustomizationAttachmentReferenceField;
	let baseFilter = wixData.filter().hasSome(ATTACHMENT_REFERENCE_FIELD, [currentItem._id]);

	$w("#dataset1").onReady(function () {
		const PARENT_CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[PARENT_KEY].CustomizationDb;
		const PARENT_SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[PARENT_KEY].CustomizationSourceTypeField;

		$w("#listRepeater").onItemReady(($item, itemData) => {
			$item("#armorImage").fitMode = "fit";
			
			let currentAttachment = itemData;
			let sourceString = "";
			wixData.queryReferenced(PARENT_CUSTOMIZATION_DB, currentAttachment._id, PARENT_SOURCE_TYPE_REFERENCE_FIELD)
				.then((results) => {
					results.items.forEach(element => {
						sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ", ";
					});

					// Remove the final comma.
					sourceString = sourceString.substr(0, sourceString.length - 2);

					$item("#itemSource").text = sourceString;
				})
				.catch((error) => {
					console.error("Error occurred while querying " + PARENT_CUSTOMIZATION_DB + ": " + error);
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
				const HIDDEN_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationHiddenField;
				let hideHiddenFilter = baseFilter.ne(HIDDEN_FIELD, true);
				$w("#dataset1").setFilter(hideHiddenFilter)
					.then(() => {
						$w("#hideHiddenButton").hide();
						$w("#showHiddenButton").show();
					});
			});
	});
});
