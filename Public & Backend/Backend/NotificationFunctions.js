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
	sendPushNotification(articleTitle, articleShortDescription, "News Article", articleUrl, "News Articles");
	DiscordFunctions.sendDiscordMessage("news", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}

export function sendPromotionNotification(articleTitle, articleShortDescription, articleUrl) {
	sendPushNotification(articleTitle, articleShortDescription, "Promotion Article", articleUrl, "Promotion Articles");
	DiscordFunctions.sendDiscordMessage("promotions", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}