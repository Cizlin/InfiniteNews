import * as ShopFunctions from 'backend/ShopAutomationFunctions.jsw';
import * as DiscordFunctions from 'backend/DiscordBotFunctions.jsw';

export function sendNewsNotification(articleTitle, articleShortDescription, articleUrl) {
	ShopFunctions.sendPushNotification(articleTitle, articleShortDescription, "News Article", articleUrl, "News Articles");
	DiscordFunctions.sendDiscordMessage("news", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}

export function sendPromotionNotification(articleTitle, articleShortDescription, articleUrl) {
	ShopFunctions.sendPushNotification(articleTitle, articleShortDescription, "Promotion Article", articleUrl, "Promotion Articles");
	DiscordFunctions.sendDiscordMessage("promotions", articleTitle + "\n" + articleShortDescription + "\n" + articleUrl, true);
}