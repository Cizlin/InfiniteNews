const Twitter = require('twitter');
import {getSecret} from 'wix-secrets-backend';
import wixMediaBackend from 'wix-media-backend';

export async function sendTweet(tweetBody, parentId = null) {
	// Generate and send post
	const CLIENT = new Twitter({
		consumer_key: await getSecret("TwitterApiKey"),
		consumer_secret: await getSecret("TwitterApiKeySecret"),
		access_token_key: await getSecret("TwitterAccessToken"),
		access_token_secret: await getSecret("TwitterAccessTokenSecret")
	});

	return await CLIENT.post("statuses/update", { status: tweetBody, in_reply_to_status_id: parentId, auto_populate_reply_metadata: true })
		.then((tweet, error, response) => {
			if (error) {
				console.error(error);
			} else {
				console.log(tweet);
				return tweet["id_str"];
			}
		})
		.catch(error => {
			console.error(error);
		});
}

// Uploads an image to Twitter from a Wix URL. Returns the media ID in string form, which can be used to send a Tweet with an image.
export async function uploadTwitterImage(wixImageUrl) {
	var https = require('https');

	let url = await wixMediaBackend.mediaManager.getDownloadUrl(wixImageUrl);

	return new Promise((resolve, reject) => {
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

					console.log(imageBuffer.byteLength);

					const CLIENT = new Twitter({
						consumer_key: await getSecret("TwitterApiKey"),
						consumer_secret: await getSecret("TwitterApiKeySecret"),
						access_token_key: await getSecret("TwitterAccessToken"),
						access_token_secret: await getSecret("TwitterAccessTokenSecret")
					});

					let media_id_string = await CLIENT.post("media/upload", { media: imageBuffer })
						.then((tweet, error, response) => {
							if (error) {
								console.error(error);
								return "erroneous";
							} else {
								console.log(tweet);
								return tweet["media_id_string"];
							}
						})
						.catch(error => {
							console.error(error);
							return "erroneous";
						});

						if (media_id_string != "erroneous") {
							resolve(media_id_string);
						}
						else {
							reject("Could not upload image to Twitter from Wix URL " + wixImageUrl);
						}
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
}

async function testTweet() {
	let parentId = await sendTweet("This should finally be the one that works. If not, we'll be done testing anyway for tonight. Sorry for the notification spam!");
	console.log(parentId);
	if (parentId) {
		sendTweet("This is the final test reply to the above Tweet", parentId);
	}
}
