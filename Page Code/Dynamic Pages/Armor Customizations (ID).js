import wixData from 'wix-data';
import {initialItemSetup} from 'public/ItemSetup.js';
import {ARMOR_CUSTOMIZATION_ATTACHMENTS_DB, ARMOR_CUSTOMIZATION_SECTION, ARMOR_SOCKET_REFERENCE_FIELD, ARMOR_CUSTOMIZATION_ATTACHMENTS_PARENT_REFERENCE_FIELD} from 'public/KeyConstants.js';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	//console.log("Image Credit Text has ID " + $w("#imageCreditText").id);
	initialItemSetup(ARMOR_CUSTOMIZATION_SECTION);
	
	let currentItem = $w("#dynamicDatasetItem").getCurrentItem(); // Get the current item to add the attachment customization type.
	let baseFilter = wixData.filter().hasSome(ARMOR_CUSTOMIZATION_ATTACHMENTS_PARENT_REFERENCE_FIELD, [currentItem._id]);

	$w("#hideHiddenButton").hide();

	$w("#dataset1").onReady(async () => { 
		// If there are no attachments for the item, hide the attachment list and header.
		if (!($w("#listRepeater").data.length > 0)) {
			//$w("#attachmentsHeader").hide();
			//$w("#listRepeater").hide();
			$w("#attachmentContainer").collapse();
		}
		else {
			// Otherwise update the customization type displayed for each attachment.
			$w("#listRepeater").onItemReady(($item, itemData) => {
				$item("#image2").fitMode = "fit";
				//console.log(itemData);
				let currentAttachment = itemData;
				$item("#attachmentCustomizationType").text = currentItem[ARMOR_SOCKET_REFERENCE_FIELD].name + " Attachment";
				let sourceString = "";
				wixData.queryReferenced(ARMOR_CUSTOMIZATION_ATTACHMENTS_DB, currentAttachment._id, "sourceTypeReference")
					.then((results) => {
						//console.log(currentAttachment.itemName);
						results.items.forEach(element => {
							sourceString += element.name + ", ";
						});

						// Remove the final comma.
						sourceString = sourceString.substr(0, sourceString.length - 2);

						$item("#attachmentSourceString").text = sourceString;
					})
					.catch((error) => {
						console.error("Error occurred while querying " + ARMOR_CUSTOMIZATION_ATTACHMENTS_DB + ": " + error);
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
		}
	});
});
