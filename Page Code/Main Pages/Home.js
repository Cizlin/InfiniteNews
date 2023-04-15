import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';

import wixData from 'wix-data';

import * as SocketSetupFunctions from 'public/SocketSetup.js';

$w.onReady(async function () {
	// The choice here is non-specific to the challenges. We could also use Shop Key or anything else that doesn't have cores.
	// The goal is to refresh the saved session data for our filters and search.
	SocketSetupFunctions.initialSocketSetup(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY); 

	$w("#effectVideoPlayer").collapse();
	$w("#effectVideoPlayer").hide();

	$w("#blog1").hide();
	
	$w("#ultimateChallengeDataset").onReady(async () => {
		let ultimateChallenge = $w("#ultimateChallengeDataset").getCurrentItem();
		$w("#ultimateChallengeDescription").text = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DESCRIPTION_FIELD] + " - " +
			ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_COMPLETION_THRESHOLD_FIELD];

		// Now that we have our current Ultimate Challenge, we need to grab the reward by using the fieldsWithItems field.
		let categoryWithItems = "";
		if (ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD].length > 0) {
			categoryWithItems = ultimateChallenge[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_FIELDS_WITH_ITEMS_FIELD][0]; // We're just going to grab the first category and item for now.
			let queryResults = await wixData.queryReferenced(CapstoneChallengeConstants.CAPSTONE_CHALLENGE_DB, ultimateChallenge._id, categoryWithItems);
			if (queryResults.items.length > 0) {
				ultimateChallenge[categoryWithItems] = queryResults.items; // Save the child items we just got to our rank item.
			}
		}
		else {
			console.error("No reward categories found for this capstone challenge: " + ultimateChallenge);
			return;
		}

		const CUSTOMIZATION_CATEGORY = CustomizationConstants.CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT[categoryWithItems];

		if (ultimateChallenge[categoryWithItems].length > 0) {
			let childItem = ultimateChallenge[categoryWithItems][0];

			// We need to retrieve the customization type.
			const SOCKET_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].SocketDb;
			const CUSTOMIZATION_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationSocketReferenceField;
			const SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].SocketNameField;

			let customizationTypeResults = await wixData.query(SOCKET_DB)
				.eq("_id", childItem[CUSTOMIZATION_TYPE_REFERENCE_FIELD])
				.find();

			let childItemCustomizationType = customizationTypeResults.items[0][SOCKET_NAME_FIELD];

			const CUSTOMIZATION_URL_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationUrlField;
			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationImageField;
			const CUSTOMIZATION_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationNameField;

			$w("#ultimateChallengeButton").link = childItem[CUSTOMIZATION_URL_FIELD];
			$w("#ultimateChallengeImage").src = childItem[CUSTOMIZATION_IMAGE_FIELD];
			$w("#ultimateChallengeImage").fitMode = "fit";
			$w("#ultimateChallengeRewardText").text = childItem[CUSTOMIZATION_NAME_FIELD] + " " + childItemCustomizationType;

			if ("CustomizationEffectVideoField" in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY] &&
				childItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationEffectVideoField]) {

				$w("#effectVideoPlayer").src = childItem[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[CUSTOMIZATION_CATEGORY].CustomizationEffectVideoField];

				console.log("Showing video and hiding image.")
				$w("#ultimateChallengeImage").collapse();
				$w("#ultimateChallengeImage").hide();
				$w("#effectVideoPlayer").expand();
				$w("#effectVideoPlayer").show();
			}
		}
		else {
			console.error("No rewards found for this capstone challenge: " + ultimateChallenge);
		}
	});

	// Update the Featured Pass listing.
	$w("#passDataset").onReady(() => {
		let pass = $w("#passDataset").getCurrentItem();
		$w("#passType").text = (pass[PassConstants.PASS_IS_EVENT_FIELD]) ? PassConstants.PASS_EVENT : PassConstants.PASS_BATTLE;
	});

	// Update the Featured Shop Bundle Listing
	$w("#shopDataset").onReady(() => {
		let shopBundle = $w("#shopDataset").getCurrentItem();
		$w("#shopImage").fitMode = "fit";
		$w("#shopCreditCost").text = "Credits: " + shopBundle[ShopConstants.SHOP_COST_CREDITS_FIELD];
	});

	// Update the Feature Twitch Drop listing.
	$w("#twitchDropDataset").onReady(async () => {
		let twitchDrop = $w("#twitchDropDataset").getCurrentItem();
		// We need to manually associate these images based on the references.
		let referencedRewards = await wixData.queryReferenced("TwitchDrops", twitchDrop._id, "rewardReferences")
			.then((results) => {
				return results.items;
			})
			.catch((error) => {
				console.error("Error occurred while retrieving referenced rewards for a drop, ", error, twitchDrop);
				return [];
			});

		if (referencedRewards.length > 0 && referencedRewards[0].imageSet && referencedRewards[0].imageSet.length > 0) {
			$w("#twitchDropRewardImage").src = referencedRewards[0].imageSet[0]; // Associate the drop with its first reward if one is defined.
		}

		let rewardListText = "";

		if (referencedRewards.length === 0) {
			// There were no referenced rewards added to this drop. Use the rewardGroups field instead.
			for (let i = 0; i < twitchDrop.rewardGroups.length; ++i) {
				for (let j = 0; j < twitchDrop.rewardGroups[i].rewards.length; ++j) {
					rewardListText += twitchDrop.rewardGroups[i].rewards[j].name;

					if (i < referencedRewards.length - 1) {
						// Add a comma-space separator in all but the last case.
						rewardListText += ", ";
					}
				}
			}
		}
		else {
			for (let i = 0; i < referencedRewards.length; ++i) {
				rewardListText += referencedRewards[i].notificationText;

				if (i < referencedRewards.length - 1) {
					// Add a comma-space separator in all but the last case.
					rewardListText += ", ";
				}
			}
		}

		if (rewardListText === "") {
			rewardListText = "Rewards pending. Check back soon!";
		}

		$w("#twitchDropRewards").text = rewardListText;
		$w("#twitchDropRewardImage").fitMode = "fit";
	});

	// Update the Featured Shop Bundle Listing
	/*$w("#shopDatasetDaily").onReady(() => {
		let shopBundle = $w("#shopDatasetDaily").getCurrentItem();
		if (shopBundle) {
			$w("#shopImageDaily").fitMode = "fit";
			$w("#shopCreditCostDaily").text = "Credits: " + shopBundle[ShopConstants.SHOP_COST_CREDITS_FIELD];
		}
		else {
			$w("#shopImageDaily").hide();
			$w("#shopImageDaily").collapse();
			$w("#shopBundleTypeDaily").hide();
			$w("#shopBundleTypeDaily").collapse();
			$w("#shopCreditCostDaily").hide();
			$w("#shopCreditCostDaily").collapse();
			$w("#shopButtonDaily").hide();
			$w("#shopButtonDaily").collapse();
		}
	});*/


});
