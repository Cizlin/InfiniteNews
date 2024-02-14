import wixData from 'wix-data';
import * as ItemSetupFunctions from 'public/ItemSetup.js';
import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

$w.onReady(function () {
	$w("#effectVideoPlayer").collapse();
	$w("#effectVideoPlayer").hide();

	//console.log("Image Credit Text has ID " + $w("#imageCreditText").id);
	const CUSTOMIZATION_CATEGORY = ArmorConstants.ARMOR_KEY;
	ItemSetupFunctions.initialItemSetup(CUSTOMIZATION_CATEGORY);

	const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].AttachmentKey;
	const ATTACHMENT_PARENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationParentReferenceField;

	$w("#dynamicDatasetItem").onReady(() => {
		let currentItem = $w("#dynamicDatasetItem").getCurrentItem(); // Get the current item to add the attachment customization type.

		if (currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationEffectVideoField]) {
			$w("#effectVideoPlayer").src = currentItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationEffectVideoField];
			$w("#itemImage").collapse();
			$w("#itemImage").hide();
			$w("#effectVideoPlayer").expand();
			$w("#effectVideoPlayer").show();
		}

		let baseFilter = wixData.filter().hasSome(ATTACHMENT_PARENT_REFERENCE_FIELD, [currentItem._id]);

		$w("#hideHiddenButton").hide();

		$w("#dataset1").onReady(async () => { 
			// If there are no attachments for the item, hide the attachment list and header.
			if (!($w("#listRepeater").data.length > 0)) {
				$w("#attachmentContainer").collapse();
			}
			else {
				// Otherwise update the customization type displayed for each attachment.
				//const SOCKET_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSocketReferenceField;
				//const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].SocketNameField;

				const ATTACHMENT_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;
				const ATTACHMENT_SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationSourceTypeField;
				const ATTACHMENT_HIDDEN_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationHiddenField;
				let hideHiddenFilter = baseFilter.ne(ATTACHMENT_HIDDEN_FIELD, true);
				$w("#dataset1").setFilter(hideHiddenFilter)
					.then(() => {
						$w("#hideHiddenButton").hide();
						$w("#showHiddenButton").show();
					});

				$w("#listRepeater").onItemReady(($item, itemData) => {
					$item("#image2").fitMode = "fit";
					//console.log(itemData);
					let currentAttachment = itemData;
					//$item("#attachmentCustomizationType").text = currentItem[SOCKET_REFERENCE_FIELD][SOCKET_NAME_FIELD] + " Attachment";
					let sourceString = "";
					wixData.queryReferenced(ATTACHMENT_DB, currentAttachment._id, ATTACHMENT_SOURCE_TYPE_REFERENCE_FIELD)
						.then((results) => {
							//console.log(currentAttachment.itemName);
							results.items.forEach(element => {
								sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ", ";
							});

							// Remove the final comma.
							sourceString = sourceString.substr(0, sourceString.length - 2);

							$item("#attachmentSourceString").text = sourceString;
						})
						.catch((error) => {
							console.error("Error occurred while querying " + ATTACHMENT_DB + ": " + error);
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
					const ATTACHMENT_HIDDEN_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationHiddenField;
					let hideHiddenFilter = baseFilter.ne(ATTACHMENT_HIDDEN_FIELD, true);
					$w("#dataset1").setFilter(hideHiddenFilter)
						.then(() => {
							$w("#hideHiddenButton").hide();
							$w("#showHiddenButton").show();
						});
				});
			}
		});
	});
});
