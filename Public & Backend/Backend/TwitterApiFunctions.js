const Twitter = require('twitter');
const { TwitterApi } = require('twitter-api-v2');
import {getSecret} from 'wix-secrets-backend';
import wixMediaBackend from 'wix-media-backend';
import * as internalNotifications from 'backend/InternalNotificationFunctions.jsw';

// mediaIds should be comma-separated list of media IDs to include in the Tweet.
export async function sendTweet(tweetBody, parentId = null, mediaIds = null) {
	// Generate and send post
	let CLIENT;

	const CREDENTIALS = {
		appKey: await getSecret("TwitterApiKey"),
		appSecret: await getSecret("TwitterApiKeySecret"),
		accessToken: await getSecret("TwitterAccessToken"),
		accessSecret: await getSecret("TwitterAccessTokenSecret")
	};

	try {
		CLIENT = new TwitterApi(CREDENTIALS);
	}
	catch(error) {
		console.error(error);
	}

	//console.log("Sending Tweet with Images...");

	let options = {};

	if (parentId) {
		options.reply = {
			in_reply_to_tweet_id: parentId
		}
	}

	if (mediaIds && mediaIds.length > 0) {
		options.media = {
			media_ids: mediaIds
		}
	}

	return await CLIENT.v2.tweet(tweetBody, options)
		.then((tweet) => {
			console.log(tweet);
			return tweet.data.id;
		})
		.catch(error => {
			console.error(error);

		});
}

// Uploads an image to Twitter from a Wix URL. Returns the media ID in string form, which can be used to send a Tweet with an image.
export async function uploadTwitterImage(wixImageUrl) {
	var https = require('https');

	let url = await wixMediaBackend.mediaManager.getDownloadUrl(wixImageUrl);

	let media = await new Promise((resolve, reject) => {
		let request = https.get(url, (response) => {
			let { statusCode } = response;
			console.log(`statusCode: ${statusCode}`);

			let error;

			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' +
					`Status Code: ${statusCode}`);
			}

			if (error) {
				//console.error(error.message);
				// consume response data to free up memory
				response.resume();
			}

			// We're expecting a png to be transferred as singular bytes. This means we want the latin1 encoding, which replaces the legacy binary encoding.
			response.setEncoding('latin1');
			let imageString = "";

			// Get each chunk of bytes from the response.
			response.on('data', d => {
				imageString += d;
			});

			response.on('end', async () => {
				try {
					let imageBuffer = Buffer.from(imageString, 'latin1');
					resolve(imageBuffer);
				}
				catch (e) {
					console.error("Got error " + e + " while trying to fetch image from Wix Url " + wixImageUrl);
					reject("Could not upload image to Twitter from Wix URL " + wixImageUrl);
				}
			})
		});

		request.on('error', error => {
			console.error(`Got error: ${error.message}.`);
			reject("Could not upload image to Twitter from Wix URL " + wixImageUrl);
		});

		request.end();
	});

	console.log("Creating Twitter client.");

	const CLIENT = new Twitter({
		consumer_key: await getSecret("TwitterApiKey"),
		consumer_secret: await getSecret("TwitterApiKeySecret"),
		access_token_key: await getSecret("TwitterAccessToken"),
		access_token_secret: await getSecret("TwitterAccessTokenSecret")
	});

	console.log("Performing post to Twitter");

	let media_id_string = await CLIENT.post("media/upload", { media: media })
		.then((media, error, response) => {
			if (error) {
				console.error(error);
				internalNotifications.notifyOwner("Error occurred during Twitter Image Upload.", error[0].message);
				return "erroneous";
			} else {
				console.log(media);
				return media["media_id_string"];
			}
		})
		.catch(error => {
			console.error(error);
			internalNotifications.notifyOwner("Error occurred during Twitter Image Upload.", error[0].message);
			return "erroneous";
		});

	if (media_id_string != "erroneous") {
		console.log(media_id_string);
		return media_id_string;
	}
	else {

		throw "Could not upload image to Twitter from Wix URL " + wixImageUrl;
	}
}

export async function testTweet() {
	let parentId = await sendTweet("Testing new setup on API side. Please ignore! This will be deleted soon.");
	console.log(parentId);
	if (parentId) {
		sendTweet("Test reply", parentId);
	}
}
