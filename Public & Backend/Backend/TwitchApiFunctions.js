import wixFetch from 'wix-fetch';
import wixSecretsBackend from 'wix-secrets-backend';
import wixData from 'wix-data';
import _ from 'lodash';
import * as notifs from 'backend/InternalNotificationFunctions.jsw';

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

export async function getExistingTwitchDrops() {
    return await wixData.query("TwitchDrops")
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
    let databaseTwitchDrops = await getExistingTwitchDrops();

    let sendAlert = false; // This will allow us to send an alert if a new Twitch Drop is added or if an existing one is updated.

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
            }

            if (apiTwitchDrops[i].campaignEnd.valueOf() != databaseTwitchDrops[matchingIndex].campaignEnd.valueOf()) {
                // The end times do not align.
                databaseTwitchDrops[matchingIndex].campaignEnd = apiTwitchDrops[i].campaignEnd;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignEnd");
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
            }
        }
        else {
            // This is a new Twitch Drop. We can just port over the database Twitch Drop and add some bonus fields.
            apiTwitchDrops[i].needsReview = true;
            apiTwitchDrops[i].updatedFields = ["new"];
            databaseTwitchDrops.push(apiTwitchDrops[i]);

            sendAlert = true;
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
}

export function arraysAreEqual(arr1, arr2) {
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
