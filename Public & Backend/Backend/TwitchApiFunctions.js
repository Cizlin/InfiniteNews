import wixFetch from 'wix-fetch';
import wixSecretsBackend from 'wix-secrets-backend';
import wixData from 'wix-data';
import _ from 'lodash';
import * as notifs from 'backend/InternalNotificationFunctions.jsw';
import * as twitter from 'backend/TwitterApiFunctions.jsw';
import * as discord from 'backend/NotificationFunctions.jsw';

// Retrieves the headers from the secret manager.
export async function makeTwitchHeaders() {
    return {
        "authorization": await wixSecretsBackend.getSecret("TwitchOAuth"),
        "client-id": await wixSecretsBackend.getSecret("TwitchClientId")
    };
}

// Retrieves a list of drops from the Twitch API.
export async function getDropList() {
    let headers = await makeTwitchHeaders();

    return await wixFetch.fetch("https://gql.twitch.tv/gql", { 
        "method": "post",
        "headers": headers,
        "body": JSON.stringify({
            "operationName": "ViewerDropsDashboard",
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "8d5d9b5e3f088f9d1ff39eb2caab11f7a4cf7a3353da9ce82b5778226ff37268"
                }
            },
            "variables": {
                "fetchRewardCampaigns": true
            }
        })
    })
    .then((response) => {
        return response.json();
        
    })
    .then(jsonResponse => {
        let dropsList = [];
        for (let i = 0; i < jsonResponse.data.currentUser.dropCampaigns.length; ++i) {
            let drop = jsonResponse.data.currentUser.dropCampaigns[i];
            if (drop.game.id == "506416") { // Halo Infinite ID.
                console.log(drop.id);
                dropsList.push(drop.id); // Add the ID to the list.
            }
        }

        return dropsList;
    })
    .catch((error) => {
        console.error(error + " occurred while retrieving list of Twitch Drops from the API.");
        throw error; // Throwing error up a level since this should be fatal.
    });
}

// Retrieves specific drop information based on a provided drop ID.
export async function getDropInfo(dropId) {
    let headers = await makeTwitchHeaders();
    let channelLogin = await wixSecretsBackend.getSecret("TwitchChannelLogin");

    return await wixFetch.fetch("https://gql.twitch.tv/gql", {
        "method": "post",
        "headers": headers,
        "body": JSON.stringify({
            "operationName": "DropCampaignDetails",
            "variables": {
                "dropID": dropId,
                "channelLogin": channelLogin
            },
            "extensions": {
                "persistedQuery": {
                "version": 1,
                "sha256Hash": "f6396f5ffdde867a8f6f6da18286e4baf02e5b98d14689a69b5af320a4c7b7b8"
                }
            }
        })
    })
    .then(response => {
        return response.json();
    })
    .then(jsonResponse => {
        return jsonResponse;
    })
    .catch(error => {
        console.error(error + " occurred while retrieving addition drop info for Twitch Drop ID " + dropId);
        throw error; // Right now, a single bad drop will be fatal. TODO: Need to reevaluate later.
    })
}

// Generates the Twitch Drop JSONs that are used to populate the Twitch Drops collection.
export async function generateNewTwitchDropJsons() {
    let dropIds = await getDropList();
    let dropInfoArray = [];
    for (let i = 0; i < dropIds.length; ++i) {
        let dropJson = await getDropInfo(dropIds[i]);
        let minimalJson = {};
        minimalJson.dropId = dropIds[i];
        minimalJson.allowedChannels = [];

        for (let j = 0; j < dropJson.data.user.dropCampaign.allow.channels.length; ++j) {
            minimalJson.allowedChannels.push({
                url: "https://www.twitch.tv/" + dropJson.data.user.dropCampaign.allow.channels[j].name,
                name: dropJson.data.user.dropCampaign.allow.channels[j].displayName
            });
        }    

        minimalJson.campaignStart = new Date(Date.parse(dropJson.data.user.dropCampaign.startAt));
        minimalJson.campaignEnd = new Date(Date.parse(dropJson.data.user.dropCampaign.endAt));
        minimalJson.campaignName = dropJson.data.user.dropCampaign.name;

        minimalJson.status = dropJson.data.user.dropCampaign.status;

        minimalJson.rewardGroups = [];

        for (let j = 0; j < dropJson.data.user.dropCampaign.timeBasedDrops.length; ++j) {
            let rewardGroup = {
                start: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].startAt)),
                end: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].endAt)),
                requiredMinutesWatched: dropJson.data.user.dropCampaign.timeBasedDrops[j].requiredMinutesWatched,
                rewards: []
            };

            for (let k = 0; k < dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges.length; ++k) {
                rewardGroup.rewards.push(dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.name);
            }

            minimalJson.rewardGroups.push(rewardGroup);
        }

        dropInfoArray.push(minimalJson);
    }

    return dropInfoArray;
}

export async function getExistingTwitchDrops(dropIds) {
    return await wixData.query("TwitchDrops")
        .hasSome("dropId", dropIds)
        .find()
        .then(results => {
            return results.items;
        })
        .catch((error) => {
            console.error(error + " occurred while retrieving Twitch Drops from the database");
            throw error;
        });
}

export async function addAndUpdateTwitchDrops() {
    let apiTwitchDrops = await generateNewTwitchDropJsons();
    let apiDropIdArray = [];
    for (let i = 0; i < apiTwitchDrops.length; ++i) {
        apiDropIdArray.push(apiTwitchDrops[i].dropId);
    }

    let databaseTwitchDrops = await getExistingTwitchDrops(apiDropIdArray);

    let sendAlert = false; // This will allow us to send an alert if a new Twitch Drop is added or if an existing one is updated.
    let dropIsLive = false;

    for (let i = 0; i < apiTwitchDrops.length; ++i) {
        let matchingIndex = databaseTwitchDrops.findIndex(item => item.dropId == apiTwitchDrops[i].dropId);
        if (matchingIndex >= 0) {
            if (!databaseTwitchDrops[matchingIndex].needsReview) { // We've reviewed this drop already, so we need to make sure we start anew.
                databaseTwitchDrops[matchingIndex].updatedFields = [];
            }

            // The drop from the API matches one in the DB. We need to check if it needs to be updated.
            if (apiTwitchDrops[i].campaignStart.valueOf() != databaseTwitchDrops[matchingIndex].campaignStart.valueOf()) {
                // The start times do not align.
                databaseTwitchDrops[matchingIndex].campaignStart = apiTwitchDrops[i].campaignStart;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignStart");
                databaseTwitchDrops[matchingIndex].sendCorrection = true;
            }

            if (apiTwitchDrops[i].campaignEnd.valueOf() != databaseTwitchDrops[matchingIndex].campaignEnd.valueOf()) {
                // The end times do not align.
                databaseTwitchDrops[matchingIndex].campaignEnd = apiTwitchDrops[i].campaignEnd;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignEnd");
                databaseTwitchDrops[matchingIndex].sendCorrection = true;
            }

            if (apiTwitchDrops[i].campaignName != databaseTwitchDrops[matchingIndex].campaignName) {
                // The Campaign names do not align. This isn't something we need to be notified about, though.
                databaseTwitchDrops[matchingIndex].campaignName = apiTwitchDrops[i].campaignName;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignName");
            }

            if (!arraysAreEqual(apiTwitchDrops[i].allowedChannels, databaseTwitchDrops[matchingIndex].allowedChannels)) {
                // The lists of allowed channels are not equivalent.
                databaseTwitchDrops[matchingIndex].allowedChannels = apiTwitchDrops[i].allowedChannels;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("allowedChannels");
            }

            if (!arraysAreEqual(apiTwitchDrops[i].rewardGroups, databaseTwitchDrops[matchingIndex].rewardGroups)) {
                // The lists of rewards are not equivalent. Check for matching rewards.
                databaseTwitchDrops[matchingIndex].rewardGroups = apiTwitchDrops[i].rewardGroups;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("rewardGroups");
                databaseTwitchDrops[matchingIndex].sendCorrection = true;
            }

            if (apiTwitchDrops[i].status != databaseTwitchDrops[matchingIndex].status) {
                databaseTwitchDrops[matchingIndex].status = apiTwitchDrops[i].status;
                dropIsLive = (apiTwitchDrops[i].status.toUpperCase() === "ACTIVE");
            }
        }
        else {
            // This is a new Twitch Drop. We can just port over the API Twitch Drop and add some bonus fields.
            apiTwitchDrops[i].needsReview = true;
            apiTwitchDrops[i].updatedFields = ["new"]
            dropIsLive = (apiTwitchDrops[i].status.toUpperCase() === "ACTIVE");
            databaseTwitchDrops.push(apiTwitchDrops[i]);

            sendAlert = true;
        }
    }

    for (let i = 0; i < databaseTwitchDrops.length; ++i) {
        // Loop through the Twitch drops to be sent to the DB to see if we need to send any notifications for them.
        if (!databaseTwitchDrops[i].notifsSent && databaseTwitchDrops[i].status.toUpperCase() === "ACTIVE") {
            // This drop is now active and we haven't sent notifications. We need to let folks know immediately.
            try {
                await sendTwitterNotification(databaseTwitchDrops[i], false);
            }
            catch (error) {
                console.error(error + " occurred while sending Twitter notification. Continuing...");
                continue;
            }

            try {
                await sendDiscordAndPushNotification(databaseTwitchDrops[i], false);
            }
            catch (error) {
                console.error(error + " occurred while sending Discord notification. Continuing...");
                continue;
            }

            databaseTwitchDrops[i].notifsSent = true;
        }
        else if (databaseTwitchDrops[i].sendCorrection && databaseTwitchDrops[i].upcomingNotificationsSent) {
            // We've previously sent notifications for this drop, and we need to amend its start/end date or rewards.
            try {
                await sendTwitterNotification(databaseTwitchDrops[i], true, true);
            }
            catch (error) {
                console.error(error + " occurred while sending Twitter notification. Continuing...");
                continue;
            }

            try {
                await sendDiscordAndPushNotification(databaseTwitchDrops[i], true, true);
            }
            catch (error) {
                console.error(error + " occurred while sending Discord notification. Continuing...");
                continue;
            }

            databaseTwitchDrops[i].sendCorrection = false;
        }
    }

    wixData.bulkSave("TwitchDrops", databaseTwitchDrops)
        .then((results) => {
            console.log("Successfully updated Twitch Drops. Results:", results);
        })
        .catch((error) => {
            console.error("Failed to update Twitch Drops due to " + error);
        });

    if (sendAlert) {
        console.log("Sending Twitch Drop alert to owner");
        notifs.notifyOwner("New/Updated Twitch Drops", "Check the Twitch Drops database to note the latest changes.");
    }

    if (dropIsLive) {
        console.log("Sending ACTIVE Twitch Drop alert to owner...");
        notifs.notifyOwner("Twitch Drop Now ACTIVE", "Send notifications for the active Twitch Drop.")
    }
}

function arraysAreEqual(arr1, arr2) {
    if (Array.isArray(arr1) && Array.isArray(arr2)) {
        // Both inputs are arrays. Now check the length.
        if (arr1.length != arr2.length) {
            return false;
        }
        
        for (let i = 0; i < arr1.length; ++i) {
            if (arr2.findIndex(item => _.isEqual(arr1[i], item)) == -1) {
                return false;
            }
        }

        return true;
    }
}

/* This is the format of a typical Upcoming Twitter Announcement. It also has images attached to it.
RETURNING UPCOMING TWITCH DROP
Trophy Backdrop
Apr 15, 2023, 3:00 PM PDT - Apr 15, 2023, 10:00 P.M. PDT  

Channel 
https://twitch.tv/magickmoonshot

Watch for 1 hour
*/
// If isUpcoming is false, we treat it as an active notification (drop is live).
async function sendTwitterNotification(drop, isUpcoming = true, isCorrection = false) {
    let dropRewards = drop.rewardGroups;

    let useApiNames = false; // We want to avoid this in most cases, but we can use it as a fallback for Active drops (Upcoming can wait until we fix the issue).
    if (!drop.notificationRewardName || drop.notificationRewardName == "") {
        // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Notify owner since we have time to fix it.
            notifs.notifyOwner("No Notification Reward Names for Upcoming Drop", "Check the Twitch Drops collection and validate this drop: " + drop.campaignName);
            throw "No notification reward names defined for drop " + drop.campaignName;
        }
    }

    let dropRewardNotificationArray = drop.notificationRewardName.split(';'); // The notification reward names are semicolon-separated. This should result in an array with the same length as the dropRewards array.
    if (dropRewardNotificationArray.length != dropRewards.length) {
         // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active. No choice but to send out API names.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Notify owner since we have time to fix it.
            notifs.notifyOwner("Improper Notification Reward Names for Upcoming Drop", "Check the Twitch Drops collection and validate this drop: " + drop.campaignName);
            throw "Improper notification reward names defined for drop " + drop.campaignName;
        }
    }

    let tweetArray = [];
    let currentTweetIndex = 0;

    for (let i = 0; i < dropRewards.length; ++i) {
        // Begin forming the Tweet.
        //#region Tweet Header
        let tweetText = "";
        let charsLeftInTweet = 280;

        if (isCorrection) {
            tweetText += "CORRECTION: ";
        }

        if (drop.rewardIsNew) {
            tweetText += "NEW";
        }
        else {
            tweetText += "RETURNING";
        }

        if (isUpcoming) {
            tweetText += " UPCOMING TWITCH DROP\n";
        }
        else {
            tweetText += " TWITCH DROP NOW AVAILABLE\n";
        }

        tweetText += drop.campaignName + "\n\n";

        charsLeftInTweet -= tweetText.length; // Subtract away the characters for this header.
        //#endregion

        //#region Reward Name List
        let nameArray;
        if (useApiNames) {
            nameArray = dropRewards[i].rewards;
        }
        else {
            nameArray = dropRewardNotificationArray[i].split(":"); // For multiple rewards pertaining to a single drop reward group, the items are colon-separated.
        }

        for (let j = 0; j < nameArray.length; ++j) {
            let dropText = nameArray[j] + "\n";
            if (charsLeftInTweet - dropText.length < 0) {
                // This text goes over the limit. We need to make a new tweet.
                tweetArray[currentTweetIndex] = tweetText;
                currentTweetIndex++;

                tweetText = "";
                charsLeftInTweet = 280;
            }

            tweetText += dropText;
            charsLeftInTweet -= dropText.length;            
        }
        //#endregion

        //#region Drop Start and End Dates
        // Now, we add the start and end dates if it's an upcoming drop.
        if (isUpcoming) {
            let startDate = dropRewards[i].start.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour12: true,
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Los_Angeles",
                timeZoneName: "short",
                dayPeriod: "short"
            });

            let endDate = dropRewards[i].end.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour12: true,
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Los_Angeles",
                timeZoneName: "short",
                dayPeriod: "short"
            });

            let dateString = startDate + " - " + endDate + "\n";

            if (charsLeftInTweet - dateString.length < 0) {
                // This text goes over the limit. We need to make a new tweet.
                tweetArray[currentTweetIndex] = tweetText;
                currentTweetIndex++;

                tweetText = "";
                charsLeftInTweet = 280;
            }

            tweetText += dateString;
            charsLeftInTweet -= dateString.length;
        }
        //#endregion

        //#region Watch Length
        let watchLengthText = "Watch for ";
        if (dropRewards[i].requiredMinutesWatched % 60 === 0) {
            // If the number of minutes required to watch is exactly divisible by 60, convert to hours. Otherwise, leave as minutes.
            watchLengthText += (dropRewards[i].requiredMinutesWatched / 60).toString() + " hour";
            
            if (dropRewards[i].requiredMinutesWatched / 60 > 1) { // Pluralize if necessary.
                watchLengthText += "s";
            }

            watchLengthText += "\n\n";
        }
        else {
            watchLengthText += dropRewards[i].requiredMinutesWatched + " minute";

            if (dropRewards[i].requiredMinutesWatched > 1) {
                watchLengthText += "s";
            }

            watchLengthText += "\n\n";
        }

        if (charsLeftInTweet - watchLengthText.length < 0) {
            // This text goes over the limit. We need to make a new tweet.
            tweetArray[currentTweetIndex] = tweetText;
            currentTweetIndex++;

            tweetText = "";
            charsLeftInTweet = 280;
        }

        tweetText += watchLengthText;
        charsLeftInTweet -= watchLengthText.length;
        //#endregion

        //#region Channels List
        let channelText = "Channel";

        if (drop.allowedChannels.length > 1) {
            channelText += "s";
        }

        channelText += "\n";

        if (charsLeftInTweet - channelText.length - 24 < 0) { // Twitter URLs take 23 characters always, and we have an extra newline character at the end.
            // This text goes over the limit. We need to make a new tweet.
            tweetArray[currentTweetIndex] = tweetText;
            currentTweetIndex++;

            tweetText = "";
            charsLeftInTweet = 280;
        }

        charsLeftInTweet -= channelText.length;
        tweetText += channelText;

        tweetText += drop.allowedChannels[0].url + "\n"; // We always want to add the first one.
        charsLeftInTweet -= 24; // Must be hardcoded due to URL encoding.

        for (let j = 1; j < drop.allowedChannels.length; ++j) {
            if (charsLeftInTweet - 24 < 0) {
                // This text goes over the limit. We need to make a new tweet.
                tweetArray[currentTweetIndex] = tweetText;
                currentTweetIndex++;

                tweetText = "";
                charsLeftInTweet = 280;

                tweetText = "Channels (cont.)\n";
                charsLeftInTweet -= tweetText.length;
            }

            tweetText += drop.allowedChannels[j].url + "\n";
            charsLeftInTweet -= 24;
        }
        //#endregion

        // At this point, add what's left to the array.
        tweetArray[currentTweetIndex] = tweetText;
        currentTweetIndex++;
        console.log(charsLeftInTweet);

        tweetText = "";
        charsLeftInTweet = 280;

        console.log(tweetArray);

        //#region Image Tweet Additions
        // Determine how many images we need to upload. Note that we can only send 4 in one Tweet, so we may need multiple Tweets.
        let startIndex = drop.rewardImageMapping[i]; // This will always be the start. The end index is either the next index in the mapping - 1 or the final index in the rewardImages array.
        let endIndex;
        if (i == dropRewards.length - 1) { // This is the last reward in the list.
            // The end index is the length of the rewardImages array minus 1.
            endIndex = drop.rewardImages.length - 1;            
        }
        else {
            // The end index is the next start index minus 1.
            endIndex = drop.rewardImageMapping[i + 1] - 1;
        }
        
        // This is the number of images to upload.
        let numberOfImagesToUpload = endIndex - startIndex + 1;
        let numberOfTweetsNeeded = Math.ceil(numberOfImagesToUpload / 4); // Divide the number of images by 4 and round up.

        let additionalTweetIndex = 1;
        while (tweetArray.length < numberOfTweetsNeeded) {
            // We can add additional tweets to this array as needed.
            tweetArray[tweetArray.length] = "Additional reward images, Part " + additionalTweetIndex.toString();
            additionalTweetIndex++;
        }

        let mediaIdArray = [];
        for (let j = startIndex; j <= endIndex; ++j) {
            let mediaId = await twitter.uploadTwitterImage(drop.rewardImages[j]);
            mediaIdArray.push(mediaId);
        }
        //#endregion

        // We now have the necessary arrays of tweets and images to send to Twitter. So we shall.
        let parentId = null;
        for (let j = 0; j < tweetArray.length; ++j) {
            // Get the media to add to this Tweet.
            let mediaIds = "";
            for (let k = 4 * j; k < mediaIdArray.length; ++k) {
                mediaIds += mediaIdArray[k] + ",";
                if (mediaIds.length == 4) { // Can't add more than four media IDs to a single tweet.
                    break;
                }
            }

            //console.log(tweetArray[j], mediaIds);

            parentId = await twitter.sendTweet(tweetArray[j], parentId, mediaIds);
        }

    }
}

/* This is the format of a typical Upcoming Discord Announcement.
RETURNING UPCOMING TWITCH DROP: Gladiator's Edge Armor Coating for Mark VII - $(startTime) - $(endTime)
Watch for 1 hour. Participating channels for this upcoming Twitch Drop will be posted in the Twitch Drops article shortly.
https://www.haloinfinitenews.com/post/twitch-drops
@PromoNotifs
*/
// If isUpcoming is false, we treat it as an active notification (drop is live).
async function sendDiscordAndPushNotification(drop, isUpcoming = true, isCorrection = false) {
    let dropRewards = drop.rewardGroups;

    let useApiNames = false; // We want to avoid this in most cases, but we can use it as a fallback for Active drops (Upcoming can wait until we fix the issue).
    if (!drop.notificationRewardName || drop.notificationRewardName == "") {
        // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Owner was notified earlier.
            throw "No notification reward names defined for drop " + drop.campaignName;
        }
    }

    let dropRewardNotificationArray = drop.notificationRewardName.split(';'); // The notification reward names are semicolon-separated. This should result in an array with the same length as the dropRewards array.
    if (dropRewardNotificationArray.length != dropRewards.length) {
         // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active. No choice but to send out API names.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Owner was notified earlier.
            throw "Improper notification reward names defined for drop " + drop.campaignName;
        }
    }

    for (let i = 0; i < dropRewards.length; ++i) {
        // Begin forming the notification.
        //#region Header
        let headerText = "";

        if (isCorrection) {
            headerText += "CORRECTION: ";
        }

        if (drop.rewardIsNew) {
            headerText += "NEW";
        }
        else {
            headerText += "RETURNING";
        }

        if (isUpcoming) {
            headerText += " UPCOMING TWITCH DROP";
        }
        else {
            headerText += " TWITCH DROP NOW AVAILABLE";
        }
        //#endregion

        //#region Reward Name List
        let bodyText = drop.campaignName + ", Rewards: "

        let nameArray;
        if (useApiNames) {
            nameArray = dropRewards[i].rewards;
        }
        else {
            nameArray = dropRewardNotificationArray[i].split(":"); // For multiple rewards pertaining to a single drop reward group, the items are colon-separated.
        }

        for (let j = 0; j < nameArray.length - 1; ++j) {
            bodyText += nameArray[j] + ((nameArray.length > 2) ? ", " : " ");
        }

        bodyText += ((nameArray.length > 1) ? "and " : "") + nameArray[nameArray.length - 1];
        //#endregion

        //#region Drop Start and End Dates
        // Now, we add the start and end dates if it's an upcoming drop.
        if (isUpcoming) {
            bodyText += " - $(startTime) - $(endTime). ";
        }
        //#endregion

        //#region Watch Length and (if active) Channel.
        bodyText += "Watch for ";
        if (dropRewards[i].requiredMinutesWatched % 60 === 0) {
            // If the number of minutes required to watch is exactly divisible by 60, convert to hours. Otherwise, leave as minutes.
            bodyText += (dropRewards[i].requiredMinutesWatched / 60).toString() + " hour";
            
            if (dropRewards[i].requiredMinutesWatched / 60 > 1) { // Pluralize if necessary.
                bodyText += "s";
            }
        }
        else {
            bodyText += dropRewards[i].requiredMinutesWatched + " minute";

            if (dropRewards[i].requiredMinutesWatched > 1) {
                bodyText += "s";
            }
        }

        if (isUpcoming) {
            bodyText += ". Participating channels for this upcoming Twitch Drop will be posted in the Twitch Drops article.";
        }
        else {
            bodyText += ". Click here to find a participating streamer!";
        }
        //#endregion

        // We now have the necessary info to send to Discord and OneSignal. So we shall.
        if (isUpcoming) {
            let startDate = Math.floor(dropRewards[i].start.getTime() / 1000); // We want the seconds since epoch. Make sure it's an integer.
            let endDate = Math.floor(dropRewards[i].end.getTime() / 1000);
            //console.log(headerText, bodyText, startDate, endDate);
            discord.sendPromotionNotificationWithStartEndTime(
                headerText,
                bodyText,
                "https://www.haloinfinitenews.com/post/twitch-drops",
                startDate,
                endDate
            );
        }
        else {
            discord.sendPromotionNotification(
                headerText,
                bodyText,
                "https://www.twitch.tv/drops/campaigns?dropID=" + drop.dropId
            );
        }
    }
}

export async function sendUpcomingNotifications() {
    // First, we get a list of notifications that need to be sent.
    let upcomingDropsToNotify = await wixData.query("TwitchDrops")
        .eq("status", "UPCOMING")                   // Only consider upcoming drops
        .ne("upcomingNotificationsSent", true)      // Only consider drops that have not had notifications sent.
        .ne("notificationRewardName", "")           // Only consider drops that have been manually updated with text to send notifications with.
        .find()
        .then((results) => {
            console.log(results.items);
            return results.items;
        })
        .catch(error => {
            console.error("Error occurred when querying for upcoming drops to notify: " + error);
            return [];
        });

    // Now, we have our desired list. We want to make a separate notification for each drop.
    for (let i = 0; i < upcomingDropsToNotify.length; ++i) {
        try {
            await sendTwitterNotification(upcomingDropsToNotify[i]);
        }
        catch (error) {
            console.error(error + " occurred while sending Twitter notification. Continuing...");
            continue;
        }

        try {
            await sendDiscordAndPushNotification(upcomingDropsToNotify[i]);
        }
        catch (error) {
            console.error(error + " occurred while sending Discord notification. Continuing...");
            continue;
        }

        // Both notifications sent successfully at this point, we just need to update the flag in the item itself.
        upcomingDropsToNotify[i].upcomingNotificationsSent = true;
    }

    wixData.bulkUpdate("TwitchDrops", upcomingDropsToNotify)
        .then((results) => {
            console.log("Updated Twitch Drops after sending notifications: ", results);
        })
        .catch((error) => {
            console.error(error + " occurred while updating Twitch Drops after sending notifications.");
        })
}
