import { getSecret } from 'wix-secrets-backend';
import * as DiscordFunctions from 'backend/DiscordBotFunctions.jsw';

export async function sendPushNotification(title, body, subtitle, url, destinationSegment = "Shop Listings") {
    const appId = await getSecret("OneSignalAppId");
    const apiKey = await getSecret("OneSignalApiKey");
    const OneSignal = require('onesignal-node');
    const client = new OneSignal.Client(appId, apiKey);

    // See all fields: https://documentation.onesignal.com/reference/create-notification
    const notification = {
        headings: {
            "en": title
        },
        subtitle: {
            "en": subtitle
        },
        contents: {
            'en': body,
        },
        url: url,
        included_segments: [destinationSegment],
    };

    client.createNotification(notification)
        .then(response => {
            console.log("Notification response for notification: ", notification, ":", response);
        })
        .catch(e => {
            console.error(e);
        });
}

export function sendNewsNotification(articleTitle, articleShortDescription, articleUrl) {
    sendPushNotification(articleTitle, articleShortDescription, "News", articleUrl, "News Articles");
    DiscordFunctions.sendDiscordMessage("news", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}

export function sendPromotionNotification(articleTitle, articleShortDescription, articleUrl) {
    sendPushNotification(articleTitle, articleShortDescription, "Promotion", articleUrl, "Promotion Articles");
    DiscordFunctions.sendDiscordMessage("promotions", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}

// How to use:
// In title or shortDescription, include the following: "$(startTime)" or "$(endTime)". 
// In push notifications, these will be replaced with PST or PDT strings. 
// In Discord notifications, they will be replaced with dynamic timestamps
// The startTimeSecSinceEpoch and endTimeSecSinceEpoch should be retrieved from https://hammertime.cyou/, with the desired start date input.
export function sendPromotionNotificationWithStartEndTime(title, shortDescription, url, startTimeSecSinceEpoch, endTimeSecSinceEpoch) {
    let startDate = new Date(startTimeSecSinceEpoch * 1000); // Initialize the date object.
    let startString = startDate.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
        timeZoneName: "short",
        dayPeriod: "short"
    });
    //console.log(startString);

    let endDate = new Date(endTimeSecSinceEpoch * 1000); // Initialize the date object.
    let endString = endDate.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
        timeZoneName: "short",
        dayPeriod: "short"
    });

    // Update the push notification title and short description with the created strings.
    let pushTitle = title.replace("$(startTime)", startString);
    pushTitle = pushTitle.replace("$(endTime)", endString);

    let pushShortDescription = shortDescription.replace("$(startTime)", startString);
    pushShortDescription = pushShortDescription.replace("$(endTime)", endString);

    // Update the discord notification title and short description with the dynamic timestamp format.
    let discordTitle = title.replace("$(startTime)", "<t:" + startTimeSecSinceEpoch + ":f>");
    discordTitle = discordTitle.replace("$(endTime)", "<t:" + endTimeSecSinceEpoch + ":f>");

    let discordShortDescription = shortDescription.replace("$(startTime)", "<t:" + startTimeSecSinceEpoch + ":f>");
    discordShortDescription = discordShortDescription.replace("$(endTime)", "<t:" + endTimeSecSinceEpoch + ":f>");

    console.log(pushTitle);
    console.log(pushShortDescription);
    console.log(discordTitle);
    console.log(discordShortDescription);

    sendPushNotification(pushTitle, pushShortDescription, "Promotion", url, "Promotion Articles");
    DiscordFunctions.sendDiscordMessage("promotions", discordTitle + "\n" + discordShortDescription + "\n" + url, true);
}
