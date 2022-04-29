const Twitter = require('twitter');
import {getSecret} from 'wix-secrets-backend';

export async function sendTweet(tweetBody, parentId = null) {
	// Generate and send post
	const client = new Twitter({
		consumer_key: await getSecret("TwitterApiKey"),
		consumer_secret: await getSecret("TwitterApiKeySecret"),
		access_token_key: await getSecret("TwitterAccessToken"),
		access_token_secret: await getSecret("TwitterAccessTokenSecret")
	});

	return await client.post("statuses/update", { status: tweetBody, in_reply_to_status_id: parentId, auto_populate_reply_metadata: true })
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

async function testTweet() {
	let parentId = await sendTweet("This should finally be the one that works. If not, we'll be done testing anyway for tonight. Sorry for the notification spam!");
	console.log(parentId);
	//let parentId = "1471351232019275776";
	if (parentId) {
		sendTweet("This is the final test reply to the above Tweet", parentId);
	}
}