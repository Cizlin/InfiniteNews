import wixData from 'wix-data';

$w.onReady(function () {
	$w("#dynamicDataset").onReady(async () => {
		// We need to manually update the Reward Group Repeater.
		let datasetItem = $w("#dynamicDataset").getCurrentItem();

		let channelRepeaterArray = datasetItem.allowedChannels;
		for (let i = 0; i < channelRepeaterArray.length; ++i) {
			// Assign each channel its own id to allow the repeater to function.
			channelRepeaterArray[i]._id = i.toString();
		}

		$w("#channelRepeater").data = channelRepeaterArray;
		$w("#channelRepeater").forEachItem(($item, itemData) => {
			$item("#channelText").text = itemData.name;
			$item("#channelText").html = "<a href=\"" + itemData.url + "\">" + $item("#channelText").html + "</a>";
		});

		let repeaterArray = [];

		let rewardGroupArray = datasetItem.rewardGroups; // This is the raw reward group array. We need to import some references if they are available.
		for (let i = 0; i < rewardGroupArray.length; ++i) {
			let repeaterArrayObject = {};
			repeaterArrayObject.start = new Date(rewardGroupArray[i].start);
			repeaterArrayObject.end = new Date(rewardGroupArray[i].end);
			repeaterArrayObject.minutesToWatch = rewardGroupArray[i].requiredMinutesWatched;
			repeaterArrayObject.rewardText = "";
			repeaterArrayObject.imageArray = [];

			repeaterArrayObject._id = i.toString(); // Each object needs a unique ID.

			for (let j = 0; j < rewardGroupArray[i].rewards.length; ++j) {

				let name = rewardGroupArray[i].rewards[j].name;
				let code = rewardGroupArray[i].rewards[j].code;

				let rewardDefinition = await wixData.query("TwitchDropRewards")
					.eq("waypointId", code)
					.contains("title", name)
					.find()
					.then((results) => {
						if (results.items.length > 1) {
							throw "Too many items returned. Expected 1 and got " + results.items.length;
						}

						return results.items[0];
					})
					.catch((error) => {
						console.error("Error occurred while fetching Twitch Drop Reward matching this name and code: ", name, code, error);
						return null;
					});

				if (!rewardDefinition) {
					// Try accessing the rewards without the code if possible.
					rewardDefinition = await wixData.query("TwitchDropRewards")
						.eq("title", name)
						.find()
						.then((results) => {
							if (results.items.length > 1) {
								throw "Too many items returned. Expected 1 and got " + results.items.length;
							}

							return results.items[0];
						})
						.catch((error) => {
							console.error("Error occurred while fetching Twitch Drop Reward matching this name: ", name, error);
							return null;
						});
				}
				
				if (rewardDefinition) {
					name = rewardDefinition.notificationText;
					console.log(name);
					repeaterArrayObject.imageArray = repeaterArrayObject.imageArray.concat(rewardDefinition.imageSet);
				}
				
				repeaterArrayObject.rewardText += name + "\n";
			}

			repeaterArray.push(repeaterArrayObject);
		}

		// Assign the array to the repeater
		$w("#rewardGroupRepeater").data = repeaterArray;
		console.log(repeaterArray);

		$w("#rewardGroupRepeater").forEachItem(($item, itemData) => {
			console.log(itemData);
			// Display the repeater item's data.
			var options = {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "numeric",
				minute: "numeric",
				second: "numeric"
			};

			$item("#startDateText").text = itemData.start.toLocaleString("en", options);
			$item("#endDateText").text = itemData.end.toLocaleString("en", options);

			$item("#watchLengthText").text = "Watch for " + itemData.minutesToWatch + " minutes";

			$item("#rewardListText").text = itemData.rewardText;

			// Hide the extra images that we don't need.
			for (let i = itemData.imageArray.length + 1; i <= 8; ++i) {
				if (i == 1) {
					$item("#rewardImagesHeader").hide(); // We have no images to show right now.
				}
				$item("#image" + i).hide();
				$item("#image" + i).collapse();
			}

			for (let i = 0; i < 8 && i < itemData.imageArray.length; ++i) {
				$item("#image" + (i + 1)).src = itemData.imageArray[i];
				$item("#image" + (i + 1)).fitMode = "fit";
			}
		});
	});

});
