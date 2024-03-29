import wixFetch from 'wix-fetch';
import wixSecretsBackend from 'wix-secrets-backend';
import wixData from 'wix-data';
import _ from 'lodash';
import * as notifs from 'backend/InternalNotificationFunctions.jsw';
import * as twitter from 'backend/TwitterApiFunctions.jsw';
import * as discord from 'backend/NotificationFunctions.jsw';

const gameIdToGameName = {
    "417969": "Halo: The Master Chief Collection",
    "506416": "Halo Infinite"
}

// Retrieves the headers from the secret manager.
export async function makeTwitchHeaders() {
    return {
        "authorization": await wixSecretsBackend.getSecret("TwitchOAuth"),
        "client-id": await wixSecretsBackend.getSecret("TwitchClientId"),
        "x-device-id": "NonSiteAccess"
    };
}

export async function getClientIntegrity() {
    let headers = await makeTwitchHeaders();
    return await wixFetch.fetch("https://gql.twitch.tv/integrity", {
        "method": "post",
        "headers": headers,
        "body": "{}"
    })
    .then(response => {
        return response.json();
    })
    .then(jsonResponse => {
        return jsonResponse;
    })
    .catch(error => {
        console.error(error + " occurred while retrieving integrity for client.");
        throw error; // Right now, a single bad drop will be fatal. TODO: Need to reevaluate later.
    });
}  

// Retrieves a list of drops from the Twitch API.
export async function getDropList(returnIdsOnly = false) {
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
        console.log(jsonResponse);
        for (let i = 0; i < jsonResponse.data.currentUser.dropCampaigns.length; ++i) {
            let drop = jsonResponse.data.currentUser.dropCampaigns[i];
            if (drop.game.id in gameIdToGameName) { // Halo Infinite or Halo: MCC ID.
                console.log(drop.id);
                dropsList.push(drop); // Add the ID to the list.
            }
        }
        if (!returnIdsOnly) {
            return dropsList;
        }
        else {
            let commaSeparatedIds = "";
            for (let i = 0; i < dropsList.length; ++i) {
                if (i === 0) {
                    commaSeparatedIds = dropsList[i].id;
                }
                else {
                    commaSeparatedIds += "," + dropsList[i].id;
                }
            }

            return commaSeparatedIds;
        }
    })
    .catch((error) => {
        console.error(error + " occurred while retrieving list of Twitch Drops from the API.");
        throw error; // Throwing error up a level since this should be fatal.
    });
}

// Retrieves specific drop information based on a provided drop ID.
export async function getDropInfo(dropId) {
    let headers = await makeTwitchHeaders();
    let clientIntegrityObject = await getClientIntegrity();
    headers["client-integrity"] = clientIntegrityObject.token;
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
export async function generateNewTwitchDropJsons(useAutomation = true, providedDropJsonArray = []) {
    if (useAutomation) {
        let drops = await getDropList();
        let dropInfoArray = [];
        for (let i = 0; i < drops.length; ++i) {
            let dropId = drops[i].id;
            let dropJson = drops[i];
            //let dropJson = await getDropInfo(dropIds[i]);
            //console.log(dropJson);
            let minimalJson = {};
            minimalJson.dropId = dropId;
            //minimalJson.allowedChannels = [];

            /*for (let j = 0; j < dropJson.data.user.dropCampaign.allow.channels.length; ++j) {
                minimalJson.allowedChannels.push({
                    url: "https://www.twitch.tv/" + dropJson.data.user.dropCampaign.allow.channels[j].name,
                    name: dropJson.data.user.dropCampaign.allow.channels[j].displayName
                });
            }   */ 

            minimalJson.campaignStart = new Date(Date.parse(dropJson.startAt)); //new Date(Date.parse(dropJson.data.user.dropCampaign.startAt));
            minimalJson.campaignEnd = new Date(Date.parse(dropJson.endAt)); //new Date(Date.parse(dropJson.data.user.dropCampaign.endAt));
            minimalJson.campaignName = dropJson.name; //dropJson.data.user.dropCampaign.name;

            minimalJson.status = (minimalJson.campaignEnd < new Date()) ? "EXPIRED" : dropJson.status; //dropJson.data.user.dropCampaign.status;

            minimalJson.game = gameIdToGameName[dropJson.game.id];

            /*minimalJson.rewardGroups = [];

            for (let j = 0; j < dropJson.data.user.dropCampaign.timeBasedDrops.length; ++j) {
                let rewardGroup = {
                    start: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].startAt)),
                    end: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].endAt)),
                    requiredMinutesWatched: dropJson.data.user.dropCampaign.timeBasedDrops[j].requiredMinutesWatched,
                    rewards: []
                };

                for (let k = 0; k < dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges.length; ++k) {
                    rewardGroup.rewards.push({
                        name: dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.name,
                        code: dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.id
                    });
                }

                minimalJson.rewardGroups.push(rewardGroup);
            }*/

            dropInfoArray.push(minimalJson);
        }

        return dropInfoArray;
    }
    else {
        let dropInfoArray = [];
        for (let i = 0; i < providedDropJsonArray.length; ++i) {
            let dropJson = providedDropJsonArray[i];
            console.log(dropJson);
            let dropId = dropJson.data.user.dropCampaign.id;
            let minimalJson = {};
            minimalJson.dropId = dropId;
            minimalJson.allowedChannels = [];

            if (dropJson.data.user.dropCampaign.allow.channels) {
                for (let j = 0; j < dropJson.data.user.dropCampaign.allow.channels.length; ++j) {
                    minimalJson.allowedChannels.push({
                        url: "https://www.twitch.tv/" + dropJson.data.user.dropCampaign.allow.channels[j].name,
                        name: dropJson.data.user.dropCampaign.allow.channels[j].displayName
                    });
                }
            }

            minimalJson.campaignStart = new Date(Date.parse(dropJson.data.user.dropCampaign.startAt));
            minimalJson.campaignEnd = new Date(Date.parse(dropJson.data.user.dropCampaign.endAt));
            minimalJson.campaignName = dropJson.data.user.dropCampaign.name;

            minimalJson.status = (minimalJson.campaignEnd < new Date()) ? "EXPIRED" : dropJson.data.user.dropCampaign.status;

            minimalJson.rewardGroups = [];

            for (let j = 0; j < dropJson.data.user.dropCampaign.timeBasedDrops.length; ++j) {
                let rewardGroup = {
                    start: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].startAt)),
                    end: new Date(Date.parse(dropJson.data.user.dropCampaign.timeBasedDrops[j].endAt)),
                    requiredMinutesWatched: dropJson.data.user.dropCampaign.timeBasedDrops[j].requiredMinutesWatched,
                    rewards: [],
                    activeTwitterNotifsSent: false,
                    activeDiscordNotifsSent: false
                };

                for (let k = 0; k < dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges.length; ++k) {
                    let idSplitArray = dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.id.split('_');
                    let code = idSplitArray[idSplitArray.length - 1];

                    rewardGroup.rewards.push({
                        name: dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.name,
                        code: code
                    });

                    let dropGameName = gameIdToGameName[dropJson.data.user.dropCampaign.timeBasedDrops[j].benefitEdges[k].benefit.game.id];

                    if (k === 0) {
                        minimalJson.game = dropGameName;
                    }
                    else if (minimalJson.game !== dropGameName) {
                        minimalJson.game += ", " + dropGameName;
                    }
                }

                minimalJson.rewardGroups.push(rewardGroup);
            }
            
            dropInfoArray.push(minimalJson);
        }

        return dropInfoArray;
    }
}

export async function getExistingTwitchDrops(dropIds) {
    return await wixData.query("TwitchDrops")
        .hasSome("dropId", dropIds)
        //.eq("status", "ACTIVE")
        .include("rewardReferences")
        .find()
        .then(results => {
            return results.items;
        })
        .catch((error) => {
            console.error(error + " occurred while retrieving Twitch Drops from the database");
            throw error;
        });
}

function rewardGroupsAreEqual(rewardGroupArray1, rewardGroupArray2) {
    console.log(rewardGroupArray1, rewardGroupArray2);
    // We want to check the equivalence of the start, end, requiredMinutesWatched, and rewards fields.
    if (rewardGroupArray1.length != rewardGroupArray2.length) {
        return false; // There's a mismatch in the number of rewards in each group.
    }

    for (let i = 0; i < rewardGroupArray1.length; ++i) {
        let matchingRewardGroupFound = false;

        for (let j = 0; j < rewardGroupArray2.length; ++j) {
            // Scan through the second reward group array to see if we find matching rewards arrays.
            if (arraysAreEqual(rewardGroupArray1[i].rewards, rewardGroupArray2[j].rewards)) {
                console.log("Arrays are equal.");
                // The two reward arrays are equal. Now, check to see if the start, end, and requiredMinutesWatched match.
                console.log(rewardGroupArray1[i].start.getTime(), rewardGroupArray2[j].start.getTime());
                if (rewardGroupArray1[i].start.getTime() != rewardGroupArray2[j].start.getTime()
                || rewardGroupArray1[i].end.getTime() != rewardGroupArray2[j].end.getTime()
                || rewardGroupArray1[i].requiredMinutesWatched != rewardGroupArray2[j].requiredMinutesWatched) {
                    // This is a mismatch, so we return false.
                    return false;
                }
                else {
                    // These are equal, so we found a match. We can move on to the next 
                    matchingRewardGroupFound = true;
                    break;
                }
            }
        }

        // Now that we're done searching, check to see if we found a match.
        if (!matchingRewardGroupFound) {
            return false;
        }
    }

    // We managed to avoid returning false, so we must have exactly matching arrays. Return true.
    return true;
}

export async function refreshAllTwitchDrops(useAutomation = true, dropJsonArray = []) {
    let apiTwitchDrops = await generateNewTwitchDropJsons(useAutomation, dropJsonArray);
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
                databaseTwitchDrops[matchingIndex].sendCorrection = (databaseTwitchDrops[matchingIndex].upcomingNotificationsSent) ? true : false;
            }

            if (apiTwitchDrops[i].campaignEnd.valueOf() != databaseTwitchDrops[matchingIndex].campaignEnd.valueOf()) {
                // The end times do not align.
                databaseTwitchDrops[matchingIndex].campaignEnd = apiTwitchDrops[i].campaignEnd;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                sendAlert = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignEnd");
                databaseTwitchDrops[matchingIndex].sendCorrection = (databaseTwitchDrops[matchingIndex].upcomingNotificationsSent) ? true : false;
            }

            if (apiTwitchDrops[i].campaignName != databaseTwitchDrops[matchingIndex].campaignName) {
                // The Campaign names do not align. This isn't something we need to be notified about, though.
                databaseTwitchDrops[matchingIndex].campaignName = apiTwitchDrops[i].campaignName;
                databaseTwitchDrops[matchingIndex].updatedFields.push("campaignName");
            }

            if (!useAutomation) {
                if (!arraysAreEqual(apiTwitchDrops[i].allowedChannels, databaseTwitchDrops[matchingIndex].allowedChannels)) {
                    // The lists of allowed channels are not equivalent.
                    databaseTwitchDrops[matchingIndex].allowedChannels = apiTwitchDrops[i].allowedChannels;
                    databaseTwitchDrops[matchingIndex].needsReview = true;
                    sendAlert = true;
                    databaseTwitchDrops[matchingIndex].updatedFields.push("allowedChannels");
                }

                if (!Array.isArray(databaseTwitchDrops[matchingIndex].rewardGroups)) {
                    databaseTwitchDrops[matchingIndex].rewardGroups = apiTwitchDrops[i].rewardGroups;
                    databaseTwitchDrops[matchingIndex].needsReview = true;
                    sendAlert = true;
                    databaseTwitchDrops[matchingIndex].updatedFields.push("rewardGroups");
                    databaseTwitchDrops[matchingIndex].sendCorrection = (databaseTwitchDrops[matchingIndex].upcomingNotificationsSent) ? true : false;
                }
                else if (!rewardGroupsAreEqual(apiTwitchDrops[i].rewardGroups, databaseTwitchDrops[matchingIndex].rewardGroups)) {
                    // The lists of rewards are not equivalent. We must port over the Twitter and Discord notification flags where possible.
                    for (let k = 0; k < apiTwitchDrops[i].rewardGroups.length; ++k) {
                        for (let j = 0; j < databaseTwitchDrops[matchingIndex].rewardGroups.length; ++j) {
                            if (arraysAreEqual(apiTwitchDrops[i].rewardGroups[k].rewards, databaseTwitchDrops[matchingIndex].rewardGroups[j].rewards)) {
                                apiTwitchDrops[i].rewardGroups[k].activeDiscordNotifsSent = databaseTwitchDrops[matchingIndex].rewardGroups[j].activeDiscordNotifsSent;
                                apiTwitchDrops[i].rewardGroups[k].activeTwitterNotifsSent = databaseTwitchDrops[matchingIndex].rewardGroups[j].activeTwitterNotifsSent;
                            }
                        }
                    }

                    databaseTwitchDrops[matchingIndex].rewardGroups = apiTwitchDrops[i].rewardGroups;
                    databaseTwitchDrops[matchingIndex].needsReview = true;
                    sendAlert = true;
                    databaseTwitchDrops[matchingIndex].updatedFields.push("rewardGroups");
                    databaseTwitchDrops[matchingIndex].sendCorrection = (databaseTwitchDrops[matchingIndex].upcomingNotificationsSent) ? true : false;
                }
            }

            if (apiTwitchDrops[i].status != databaseTwitchDrops[matchingIndex].status) {
                databaseTwitchDrops[matchingIndex].status = apiTwitchDrops[i].status;
                dropIsLive = (apiTwitchDrops[i].status.toUpperCase() === "ACTIVE");
            }

            if (apiTwitchDrops[i].game != databaseTwitchDrops[matchingIndex].game) {
                databaseTwitchDrops[matchingIndex].game = apiTwitchDrops[i].game;
                databaseTwitchDrops[matchingIndex].needsReview = true;
                databaseTwitchDrops[matchingIndex].updatedFields.push("game");
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

    console.log(databaseTwitchDrops);

    // Now, let's tie the drops to their rewards.
    for (let i = 0; i < databaseTwitchDrops.length; ++i) {
        if (!databaseTwitchDrops[i].rewardGroups) {
            continue; // We can't assign rewards for this drop automatically anymore. :(
        }

        if (!databaseTwitchDrops[i].rewardReferences || databaseTwitchDrops[i].rewardReferences.length === 0 || databaseTwitchDrops[i].updatedFields.includes("rewardGroups")) {
            console.log("Automatically linking rewards for " + databaseTwitchDrops[i].campaignName + ", " + databaseTwitchDrops[i].dropId);
            // If the reward references are not defined or are an empty array, we need to fetch the reward references if possible.
            // We also need to update this if the rewardGroups got updated, just in case the order changed.

            // Reset the array of rewards for this drop.
            databaseTwitchDrops[i].rewardReferences = [];

            for (let j = 0; j < databaseTwitchDrops[i].rewardGroups.length; ++j) {
                for (let k = 0; k < databaseTwitchDrops[i].rewardGroups[j].rewards.length; ++k) {
                    let name = databaseTwitchDrops[i].rewardGroups[j].rewards[k].name;
                    let code = databaseTwitchDrops[i].rewardGroups[j].rewards[k].code;
                    console.log("Name and code: " + name + ", " + code);

                    let matchingRewards = await wixData.query("TwitchDropRewards")
                        .eq("waypointId", code)
                        .find()
                        .then((results) => {
                            return results.items;
                        })
                        .catch((error) => {
                            console.error("Error occurred when retrieving Twitch drop rewards based on code: " + code + ": " + error);
                            return [];
                        });
                    
                    if (matchingRewards.length === 0) {
                        // The fetch didn't find anything matching both the name and code. We should just search based on the name, just in case the code is now being used for a different drop (unknown if this is an issue).
                        console.log("Found no results based on code. Searching only for name now.");
                        matchingRewards = await wixData.query("TwitchDropRewards")
                            .contains("title", name)
                            .find()
                            .then((results) => {
                                return results.items;
                            })
                            .catch((error) => {
                                console.error("Error occurred when retrieving Twitch drop rewards based on name only: " + name + ": " + error);
                                return [];
                            });
                    }

                    if (matchingRewards.length === 0) {
                        // If we still didn't find anything, fire a notification to the owner.
                        notifs.notifyOwner("Twitch Drop Reward Not Defined", "Add a definition to Twitch Drop Rewards for name: " + name + " and code: " + code);
                    }
                    else if (matchingRewards.length === 1) {
                        // There was exactly one return, which is desired.
                        if (!databaseTwitchDrops[i].rewardReferences) {
                            databaseTwitchDrops[i].rewardReferences = []; // Define the field if it isn't already defined.
                        }

                        databaseTwitchDrops[i].rewardReferences.push(matchingRewards[0]);
                    }
                    else {
                        notifs.notifyOwner("Multiple Twitch Drop Rewards for Code/Name Combo", "Validate the name: " + name + " and code: " + code + " in the Twitch Drop Rewards collection.");
                        // We need to resolve this manually, so let's leave it for now.
                    }
                }
            }

            console.log("Database Array Contents: ", databaseTwitchDrops[i].rewardReferences);
        }
    }

    // In order for the notifications to work, we need the URL fields, which are only generated upon inserting the items to the DB.
    let deepCopy = _.cloneDeep(databaseTwitchDrops);

    await wixData.bulkSave("TwitchDrops", deepCopy)
        .then((results) => {
            console.log("Successfully updated Twitch Drops. Results:", results);
            // Now that the drops themselves saved properly, we need to add the rewardReferences.
            for (let i = 0; i < databaseTwitchDrops.length; ++i) {
                wixData.replaceReferences("TwitchDrops", "rewardReferences", databaseTwitchDrops[i]._id, databaseTwitchDrops[i].rewardReferences)
                    .then(() => {
                        console.log("Successfully added reward references to Twitch Drops.");
                    })
                    .catch((error) => {
                        console.error("Failed to add reward references to Twitch Drops due to " + error);
                    });
            }
        })
        .catch((error) => {
            console.error("Failed to update Twitch Drops due to " + error);
        });

    // Associate the URL fields as necessary.
    for (let i = 0; i < deepCopy.length; ++i) {
        databaseTwitchDrops[i]["link-twitch-drops-1-campaignName"] = deepCopy[i]["link-twitch-drops-1-campaignName"];
        if (!databaseTwitchDrops[i]._id) {
            databaseTwitchDrops[i]._id = deepCopy[i]._id; // Ensure the IDs are ported if they don't already exist so we don't make duplicate records later.
        }
    }

    for (let i = 0; i < databaseTwitchDrops.length; ++i) {
        console.log("Reward References: ", databaseTwitchDrops[i].rewardReferences);
        // Loop through the Twitch drops to be sent to the DB to see if we need to send any notifications for them.
        if (!databaseTwitchDrops[i].notifsSent && databaseTwitchDrops[i].status.toUpperCase() === "ACTIVE") {
            // This drop is now active and we haven't sent notifications. We need to let folks know immediately.
            let allNotifsSent = false;

            try {
                allNotifsSent = await sendTwitterNotification(databaseTwitchDrops[i], false);
            }
            catch (error) {
                console.error(error + " occurred while sending Twitter notification. Continuing...");
                continue;
            }

            try {
                let result = await sendDiscordAndPushNotification(databaseTwitchDrops[i], false);
                allNotifsSent = result && allNotifsSent; // The Discord and Twitter notifications must both be fully sent for this to be true.
            }
            catch (error) {
                console.error(error + " occurred while sending Discord notification. Continuing...");
                continue;
            }

            databaseTwitchDrops[i].notifsSent = allNotifsSent;
        }
        else if (databaseTwitchDrops[i].sendCorrection && databaseTwitchDrops[i].upcomingNotificationsSent
            && databaseTwitchDrops[i].status.toUpperCase() === "UPCOMING" && !useAutomation) { // Only want to send corrections when we have the fully updated information.

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

    // Save the notification fields so we don't send multiple notifs.
    await wixData.bulkSave("TwitchDrops", databaseTwitchDrops)
        .then((results) => {
            console.log("Successfully updated Twitch Drop notification fields. Results:", results);
        })
        .catch((error) => {
            console.error("Failed to update Twitch Drops due to " + error);
        });
    
    let commaSeparatedDropIds = "";
    for (let i = 0; i < apiDropIdArray.length; ++i) {
        if (i === 0) {
            commaSeparatedDropIds = apiDropIdArray[i];
        }
        else {
            commaSeparatedDropIds += "," + apiDropIdArray[i];
        }
    }

    if (sendAlert) {
        console.log("Sending Twitch Drop alert to owner...");
        notifs.notifyOwner("New/Updated Twitch Drops", "Check the Twitch Drops database to note the latest changes for these drop IDs: " + commaSeparatedDropIds);
    }

    if (dropIsLive) {
        console.log("Sending ACTIVE Twitch Drop alert to owner...");
        notifs.notifyOwner("Twitch Drop Now ACTIVE", "Validate the active Twitch Drop(s) and update these drop IDs (includes all drops in API): " + commaSeparatedDropIds);
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

// If isUpcoming is false, we treat it as an active notification (drop is live).
async function sendTwitterNotification(drop, isUpcoming = true, isCorrection = false) {
    let dropRewards = drop.rewardGroups;
    let dropRewardNotificationArray = [];

    let useApiNames = false; // We want to avoid this in most cases, but we can use it as a fallback for Active drops (Upcoming can wait until we fix the issue).
    if (!drop.rewardReferences || drop.rewardReferences.length === 0) {
        // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Notify owner since we have time to fix it.
            notifs.notifyOwner("No Notification Reward Setup for Upcoming Drop", "Check the Twitch Drops and Twitch Drops Rewards collections and validate this drop: " + drop.campaignName);
            throw "No notification reward setup defined for drop " + drop.campaignName;
        }
    }
    else {
        dropRewardNotificationArray = drop.rewardReferences;

        // Count the number of expected rewards
        let numExpectedRewards = 0;
        for (let i =0; i < dropRewards.length; ++i) {
            numExpectedRewards += dropRewards[i].rewards.length;
        }

        if (dropRewardNotificationArray.length != numExpectedRewards) {
            console.log("Got " + dropRewardNotificationArray.length + " rewards. Expected " + numExpectedRewards + " rewards.");
            console.log(dropRewardNotificationArray);
            // If we haven't added the notification reward names yet, we can use the API names instead for Active drops. For upcoming drops, we can just notify the owner and abort.
            if (!isUpcoming) {
                // This drop is active. No choice but to send out API names.
                useApiNames = true;
            }
            else {
                // This drop is upcoming. Notify owner since we have time to fix it.
                notifs.notifyOwner("Improper Notification Reward Setup for Upcoming Drop", "Check the Twitch Drops and Twitch Drops Rewards collections and validate this drop: " + drop.campaignName);
                throw "Improper notification reward setup defined for drop " + drop.campaignName;
            }
        }
    }

    if (!dropRewards && drop.status === "ACTIVE") {
        // There are no rewards defined, which means we also can't provide any channels or a watch length. Do a streamlined notification only if this is ACTIVE.
        let tweetText = "TWITCH DROP NOW AVAILABLE\n" + drop.game + "\n" + drop.campaignName + "\nClick here for more details.\n\n";

        tweetText += "https://www.twitch.tv/drops/campaigns?dropID=" + drop.dropId;
        console.log(tweetText);

        await twitter.sendTweet(tweetText, null);

        return true;
    }
    
    let parentId = null; // The parent ID for the next Tweet to send, ensuring we send a thread and not individual Tweets.

    let allNotifsSent = true; // This becomes false if any notification for an active drop has not been sent (due to timeframe restrictions).

    for (let i = 0; i < dropRewards.length; ++i) {
        // We only want to send notifications for this particular drop if it's a valid timeframe and we haven't sent the notifications yet.

        let now = new Date(); // The current datetime.

        if (dropRewards[i].activeTwitterNotifsSent && drop.status === "ACTIVE") { // If this field is defined and true, we don't need to send notifications for this group anymore.
            continue;
        }
        else if (dropRewards[i].start > now && drop.status === "ACTIVE") {
            // If the drop starts after the current time and this is an active drop.
            allNotifsSent = false; // We aren't sending this yet, so we need to note it.
            continue;
        }

        // The array of Tweets needs to be recreated each time to avoid contaminating subsequent announcements.
        let tweetArray = [];
        let currentTweetIndex = 0;

        //#region Obtain information from reward references
        let nameArray = [];
        let imageArray = [];

        let containsNew = false; // This becomes true if one or more rewards is NEW
        let containsReturning = false; // This becomes true if one or more rewards is RETURNING
        if (useApiNames) {
            for (let j = 0; j < dropRewards[i].rewards.length; ++j) {
                nameArray.push(dropRewards[i].rewards[j].name); // Push the name of the reward into the array.
            }
        }
        else {
            let rewardArray = [];
            for (let j = 0; j < dropRewards[i].rewards.length; ++j) {
                // Get a collection of matching rewards based on the title.
                for (let k = 0; k < dropRewardNotificationArray.length; ++k) {
                    if (dropRewardNotificationArray[k].waypointId === dropRewards[i].rewards[j].code) {
                        rewardArray.push(dropRewardNotificationArray[k]); // The indices of this object are guaranteed to align with the rewardGroups array.
                    }
                }
            }

            for (let j = 0; j < rewardArray.length; ++j) {
                nameArray.push(rewardArray[j].notificationText);
                imageArray = imageArray.concat(rewardArray[j].imageSet);

                if (rewardArray[j].rewardIsNew) {
                    containsNew = true;
                }
                else {
                    containsReturning = true;
                }
            }
        }
        //#endregion

        // Begin forming the Tweet.
        //#region Tweet Header
        let tweetText = "";
        let charsLeftInTweet = 280;

        if (isCorrection) {
            tweetText += "CORRECTION: ";
        }

        if (containsNew && !containsReturning) {
            tweetText += "NEW";
        }
        else if (!containsNew && containsReturning) {
            tweetText += "RETURNING";
        }
        else if (containsNew && containsReturning) {
            tweetText += "NEW AND RETURNING";
        }
        else {
            // In this situation, we really don't know if it's new or returning. It's probably new, but we might just have not set up the definition yet. Best to just play both sides for now.
            tweetText += "NEW OR RETURNING";
        }

        if (isUpcoming) {
            tweetText += " UPCOMING TWITCH DROP\n";
        }
        else {
            tweetText += " TWITCH DROP NOW AVAILABLE\n";
        }

        tweetText += drop.game + "\n" + drop.campaignName + ((dropRewards.length > 1) ? (" - Reward Group " + (i + 1)) : "") + "\n";
        charsLeftInTweet -= tweetText.length; // Subtract away the characters for this header.

        tweetText += "https://www.haloinfinitenews.com" + drop["link-twitch-drops-1-campaignName"] + "\n\n";
        charsLeftInTweet -= 25; // The link is always 23 characters after reduction, and we have two newlines at the end.
        //#endregion

        //#region Reward Name List
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
        else if (drop.allowedChannels.length === 0) {
            channelText += "\n(Pending)";
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

        if (drop.allowedChannels.length > 0) {
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

        let mediaIdArray = [];

        // We can't add images if we don't have any.
        if (!useApiNames) {
            
            // This is the number of images to upload.
            let numberOfImagesToUpload = imageArray.length;
            let numberOfTweetsNeeded = Math.ceil(numberOfImagesToUpload / 4); // Divide the number of images by 4 and round up.

            let additionalTweetIndex = 1;
            while (tweetArray.length < numberOfTweetsNeeded) {
                // We can add additional tweets to this array as needed.
                tweetArray[tweetArray.length] = "Additional reward images, Part " + additionalTweetIndex.toString();
                additionalTweetIndex++;
            }
            for (let j = 0; j < imageArray.length; ++j) {
                let mediaId = await twitter.uploadTwitterImage(imageArray[j]);
                mediaIdArray.push(mediaId);
            }
        }
        //#endregion

        // We now have the necessary arrays of tweets and images to send to Twitter. So we shall.
        for (let j = 0; j < tweetArray.length; ++j) {
            // Get the media to add to this Tweet.
            let mediaIdSubArray = [];
            for (let k = 4 * j; k < mediaIdArray.length; ++k) {
                mediaIdSubArray.push(mediaIdArray[k]);
                if (mediaIdSubArray.length >= 4) { // Can't add more than four media IDs to a single tweet.
                    break;
                }
            }

            console.log("Tweet: ", tweetArray[j], "Media: ", mediaIdSubArray);

            parentId = await twitter.sendTweet(tweetArray[j], parentId, mediaIdSubArray);
        }

        dropRewards[i].activeTwitterNotifsSent = (drop.status === "ACTIVE"); // This should be true if the drop is active and false otherwise.

    }

    return allNotifsSent;
}

/* This is the format of a typical Upcoming Discord Announcement.
RETURNING UPCOMING TWITCH DROP: Gladiator's Edge Armor Coating for Mark VII - $(startTime) - $(endTime)
Watch for 1 hour. Participating channels for this upcoming Twitch Drop will be posted in the Twitch Drops article shortly.
https://www.haloinfinitenews.com/post/twitch-drops
@TwitchDropNotifs
*/
// If isUpcoming is false, we treat it as an active notification (drop is live).
async function sendDiscordAndPushNotification(drop, isUpcoming = true, isCorrection = false) {
    let dropRewards = drop.rewardGroups;
    let dropRewardNotificationArray = [];

    let useApiNames = false; // We want to avoid this in most cases, but we can use it as a fallback for Active drops (Upcoming can wait until we fix the issue).
    if (!drop.rewardReferences || drop.rewardReferences.length === 0) {
        // If we haven't added the notification reward names yet, we can use the API names instead for Active drpos. For upcoming drops, we can just notify the owner and abort.
        if (!isUpcoming) {
            // This drop is active.
            useApiNames = true;
        }
        else {
            // This drop is upcoming. Notify owner since we have time to fix it.
            notifs.notifyOwner("No Notification Reward Setup for Upcoming Drop", "Check the Twitch Drops and Twitch Drops Rewards collections and validate this drop: " + drop.campaignName);
            throw "No notification reward setup defined for drop " + drop.campaignName;
        }
    }
    else {
        dropRewardNotificationArray = drop.rewardReferences;

        // Count the number of expected rewards
        let numExpectedRewards = 0;
        for (let i = 0; i < dropRewards.length; ++i) {
            numExpectedRewards += dropRewards[i].rewards.length;
        }

        if (dropRewardNotificationArray.length != numExpectedRewards) {
            console.log("Got " + dropRewardNotificationArray.length + " rewards. Expected " + numExpectedRewards + " rewards.");
            console.log(dropRewardNotificationArray);
            // If we haven't added the notification reward names yet, we can use the API names instead for Active drops. For upcoming drops, we can just notify the owner and abort.
            if (!isUpcoming) {
                // This drop is active. No choice but to send out API names.
                useApiNames = true;
            }
            else {
                // This drop is upcoming. Notify owner since we have time to fix it.
                notifs.notifyOwner("Improper Notification Reward Setup for Upcoming Drop", "Check the Twitch Drops and Twitch Drops Rewards collections and validate this drop: " + drop.campaignName);
                throw "Improper notification reward setup defined for drop " + drop.campaignName;
            }
        }
    }

    if (!dropRewards && drop.status === "ACTIVE") {
        console.log("Sending ACTIVE notification to Twitch with limited info.");
        await discord.sendPromotionNotification(
            "TWITCH DROP NOW AVAILABLE, " + drop.game + ": " + drop.campaignName,
            "Click here for more details.",
            "https://www.twitch.tv/drops/campaigns?dropID=" + drop.dropId,
            true
        );

        return true;
    }

    let allNotifsSent = true; // This becomes false if any notification for an active drop has not been sent (due to timeframe restrictions).

    for (let i = 0; i < dropRewards.length; ++i) {
        // We only want to send notifications for this particular drop if it's a valid timeframe and we haven't sent the notifications yet.

        let now = new Date(); // The current datetime.

        if (dropRewards[i].activeDiscordNotifsSent && drop.status === "ACTIVE") { // If this field is defined and true, we don't need to send notifications for this group anymore.
            continue;
        }
        else if (dropRewards[i].start > now && drop.status === "ACTIVE") {
            // If the drop starts after the current time.
            allNotifsSent = false; // We aren't sending this yet, so we need to note it.
            continue;
        }

        //#region Obtain information from reward references
        let nameArray = [];

        let containsNew = false; // This becomes true if one or more rewards is NEW
        let containsReturning = false; // This becomes true if one or more rewards is RETURNING
        if (useApiNames) {
            for (let j = 0; j < dropRewards[i].rewards.length; ++j) {
                nameArray.push(dropRewards[i].rewards[j].name); // Push the name of the reward into the array.
            }
        }
        else {
            let rewardArray = [];
            for (let j = 0; j < dropRewards[i].rewards.length; ++j) {
                // Get a collection of matching rewards based on the title.
                for (let k = 0; k < dropRewardNotificationArray.length; ++k) {
                    if (dropRewardNotificationArray[k].waypointId === dropRewards[i].rewards[j].code) {
                        rewardArray.push(dropRewardNotificationArray[k]); // The indices of this object are guaranteed to align with the rewardGroups array.
                    }
                }
            }
            //dropRewardArrayEnd = dropRewardArrayStart + dropRewards[i].rewards.length; // Add the number of rewards in this group to our start in order to get the end index + 1.
            //console.log(dropRewardNotificationArray, dropRewardArrayStart, dropRewardArrayEnd);
            //let rewardArray = dropRewardNotificationArray.slice(dropRewardArrayStart, dropRewardArrayEnd); // Extract the specific rewards for this group.
            for (let j = 0; j < rewardArray.length; ++j) {
                nameArray.push(rewardArray[j].notificationText);

                if (rewardArray[j].rewardIsNew) {
                    containsNew = true;
                }
                else {
                    containsReturning = true;
                }
            }
        }
        //#endregion

        // Begin forming the notification.
        //#region Header
        let headerText = "";

        if (isCorrection) {
            headerText += "CORRECTION: ";
        }

        if (containsNew && !containsReturning) {
            headerText += "NEW";
        }
        else if (!containsNew && containsReturning) {
            headerText += "RETURNING";
        }
        else if (containsNew && containsReturning) {
            headerText += "NEW AND RETURNING";
        }
        else {
            // In this situation, we really don't know if it's new or returning. It's probably new, but we might just have not set up the definition yet. Best to just play both sides for now.
            headerText += "NEW OR RETURNING";
        }

        if (isUpcoming) {
            headerText += " UPCOMING TWITCH DROP";
        }
        else {
            headerText += " TWITCH DROP NOW AVAILABLE";
        }
        //#endregion

        //#region Reward Name List
        let bodyText = drop.game + ": " + drop.campaignName + ", Reward" + ((dropRewards.length > 1) ? (" Group " + (i + 1)) : "s") + ": ";

        for (let j = 0; j < nameArray.length - 1; ++j) {
            bodyText += nameArray[j] + ((nameArray.length > 2) ? ", " : " ");
        }

        bodyText += ((nameArray.length > 1) ? "and " : "") + nameArray[nameArray.length - 1];
        //#endregion

        //#region Drop Start and End Dates
        // Now, we add the start and end dates if it's an upcoming drop.
        if (isUpcoming) {
            bodyText += " - $(startTime) - $(endTime)";
        }
        //#endregion

        //#region Watch Length and (if active) Channel.
        bodyText += "\nWatch for ";
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
            bodyText += ". Click here for more details on this drop!";
        }
        else {
            bodyText += ". Click here for a full list of participating streamers!";
        }
        //#endregion

        // We now have the necessary info to send to Discord and OneSignal. So we shall.
        if (isUpcoming) {
            let startDate = Math.floor(dropRewards[i].start.getTime() / 1000); // We want the seconds since epoch. Make sure it's an integer.
            let endDate = Math.floor(dropRewards[i].end.getTime() / 1000);
            console.log(headerText, bodyText, startDate, endDate);
            await discord.sendPromotionNotificationWithStartEndTime(
                headerText,
                bodyText,
                "https://www.haloinfinitenews.com" + drop["link-twitch-drops-1-campaignName"],
                startDate,
                endDate,
                true, // Is Twitch Drop.
                containsNew // Contains a new reward, so notify the new drop users.
            );
        }
        else {
            console.log(headerText, bodyText);
            await discord.sendPromotionNotification(
                headerText,
                bodyText,
                "https://www.haloinfinitenews.com" + drop["link-twitch-drops-1-campaignName"],
                true,
                containsNew
            );
        }

        dropRewards[i].activeDiscordNotifsSent = (drop.status === "ACTIVE");
    }

    return allNotifsSent;
}

export async function sendUpcomingNotifications() {
    // First, we get a list of notifications that need to be sent.
    let upcomingDropsToNotify = await wixData.query("TwitchDrops")
        .eq("status", "UPCOMING")                   // Only consider upcoming drops
        .ne("upcomingNotificationsSent", true)      // Only consider drops that have not had notifications sent.
        .isNotEmpty("rewardReferences")             // Only consider drops that have been associated with rewards.
        .include("rewardReferences")                // Include the reward references so we can pull info on the specific rewards of interest.
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
        });
}

export function markExpiredDrops() {
    wixData.query("TwitchDrops")
        .eq("status", "ACTIVE")
        .find()
        .then((results) => {
            console.log("Currently ACTIVE Drops:", results.items);

            let now = new Date();

            let resultsToUpdate = [];

            results.items.forEach(item => {
                if (item.campaignEnd < now) {
                    item.status = "EXPIRED";
                    resultsToUpdate.push(item);
                }
            });

            console.log("Expired Drops:", resultsToUpdate);

            wixData.bulkUpdate("TwitchDrops", resultsToUpdate)
                .then((results) => {
                    console.log("Results aftering updating Twitch Drops to Expired:", results);
                })
                .catch((error) => {
                    console.error(error + " occurred while updating Twitch Drops to Expired.");
                })
        })
        .catch((error) => {
            console.error(error + " occurred while trying to retrieve ACTIVE Twitch Drops.");
        })
}
