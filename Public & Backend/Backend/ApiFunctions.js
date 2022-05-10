import wixFetch from 'wix-fetch';
import { createSecret, updateSecret, getSecret, listSecretInfo } from 'wix-secrets-backend';

import * as ApiConstants from 'public/Constants/ApiConstants.js';

// Retrieves the Spartan Token, either from HaloDotAPI or the SpartanToken secret with the following value format:
/* 
	{
		"Token": [SpartanToken],
		"Expiration": [ExpirationDatetime]
	}
*/
export async function getSpartanToken(refresh = true) { // The refresh argument is true by default and forces a new SpartanToken to be retrieved from the API.
	let spartanTokenJson; // This variable will contain the Json from our stored secret. 
	let tokenNeededFromApi = false; // If true, we need to get a new token from the API.
	let spartanToken = null; // This variable stores the returned token.

	// If it exists and hasn't expired, we can just return the token. If it has expired, we need to get a new one.
	try {
		spartanTokenJson = JSON.parse(await getSecret(ApiConstants.SECRETS_SPARTAN_TOKEN_KEY));
		let expirationDatetime = new Date(spartanTokenJson.Expiration); // The expiration datetime is stored within the JSON.
		let currentDatetimePlusTenMin = new Date((new Date()).getTime() + 60000); // We add 10 minute to the current datetime to make sure the expiration isn't coming immediately.

		// If the datetime is too close to or past the expiration, we need to grab a new token.
		if (currentDatetimePlusTenMin >= expirationDatetime) {
			tokenNeededFromApi = true;
		}
		else { // Our existing token is still good. Let's just use it.
			spartanToken = spartanTokenJson.Token;
		}
	}
	catch (exception) {
		// Token didn't exist most likely. Need to get it from the API.
		console.warn(exception);
		tokenNeededFromApi = true;
	}

	//console.log("Token flag value: " + tokenNeededFromApi);

	if (tokenNeededFromApi || refresh) {
		// The API expects a post request for a Spartan token. The payload is JSON including the identifier, env, and version. The below are for Halo Infinite.
		let body = {
			"identifier": "hi",
			"env": "prod",
			"version": 4
		};

		// We use the API Key stored in our secrets to query the API.
		const apiKey = await getSecret(ApiConstants.SECRETS_API_KEY);

		// Query the API. Note that the Authorization, Content-Type, and Cryptum-API-Version must all be provided in the headers.
		await wixFetch
			.fetch(ApiConstants.API_URL_BASE + "/partners/tooling/waypoint/spartan-token", {
				"method": "post",
				"headers": {
					"Authorization": apiKey,
					"Content-Type": "application/json",
					"Cryptum-API-Version": ApiConstants.API_VERSION
				},
				"body": JSON.stringify(body) // Body must be a string.
			})
			.then((httpResponse) => {
				if (httpResponse.ok) {
					return httpResponse.json();
				} else {
					return Promise.reject("Fetch did not succeed. Got HTTP Response: " + httpResponse.status);
				}
			})
			.then((json) => {
				// Now that we have our Spartan Token, we need to add it to the Secrets so we don't always have to perform this query.
				let secret = {
					name: ApiConstants.SECRETS_SPARTAN_TOKEN_KEY,
					value: JSON.stringify({
						"Token": json.data.token,
						"Expiration": json.data.expiration.date
					}),
					description: "Value needs to be parsed into JSON. The token is stored in Token, and the expiration date is stored in Expiration."
				};

				//console.log("Found Spartan Token, adding to secrets...");

				listSecretInfo() // The Spartan Token Key might exist, in which case we need to update based on the ID.
					.then((secrets) => {
						let spartanTokenId = null;
						secrets.forEach(element => {
							if (element.name == ApiConstants.SECRETS_SPARTAN_TOKEN_KEY) {
								//console.log("Found Spartan Token");
								//console.log("Returning " + element.id);
								spartanTokenId = element.id;
							}
						});

						if (spartanTokenId) {
							updateSecret(spartanTokenId, secret)
								.catch((error) => {
									console.error(error);
								});
						}
						else {
							createSecret(secret)
								.catch((error) => {
									console.error(error);
								});
						}
					})
					.catch((error) => {
						console.error(error);
					});

				spartanToken = json.data.token;
			})
			.catch(err => {
				console.error(err);
			});
	}

	return spartanToken;
}

// Retrieves the 343 Clearance from HaloDotAPI.
export async function getClearance() {
	// The API expects a post request for the clearance value. The payload is JSON including the identifier and env. The below are for Halo Infinite.
	let body = {
		"identifier": "hi",
		"env": "prod"
	}

	// We use the API Key stored in our secrets to query the API.
	const apiKey = await getSecret(ApiConstants.SECRETS_API_KEY);

	// Query the API. Note that the Authorization, Content-Type, and Cryptum-API-Version must all be provided.
	return await wixFetch
		.fetch(ApiConstants.API_URL_BASE + "/partners/tooling/waypoint/clearance", {
			"method": "post",
			"headers": {
				"Authorization": apiKey,
				"Content-Type": "application/json",
				"Cryptum-API-Version": ApiConstants.API_VERSION
			},
			"body": JSON.stringify(body)
		})
		.then((httpResponse) => {
			if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("Fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.then((json) => {
			return json.data.id;
		})
		.catch(err => {
			console.error(err);
		});
}

// Combines the Spartan Token and Clearance into a single JSON header object, along with other necessary headers.
export async function makeWaypointHeaders() {
	let spartanToken = await getSpartanToken(false);
	let clearance = await getClearance();

	return {
		[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER]: spartanToken,
		[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER]: clearance,
		"accept-language": "en-US,en;q=0.9"
	}
}

// Retrieves an item's JSON file from the Waypoint API.
export async function getCustomizationItem(headers, path) {
	// Query the Waypoint API.
	let retry = true;
	let headerFailure = false; // If the failure was likely due to issues with headers.
	let waypointJson = {};

	let retryCount = 0;
	const maxRetries = 10;

	while (retry && retryCount < maxRetries) {
		waypointJson = await wixFetch.fetch(ApiConstants.WAYPOINT_URL_BASE_PROGRESSION + path, {
			"method": "get",
			"headers": headers
		})
			.then((httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				}
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					headerFailure = true;
					return {};
				}
			})
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err + " occurred while fetching " + ApiConstants.WAYPOINT_URL_BASE_PROGRESSION + path + ". Try " + (++retryCount) + " of " + maxRetries);
				return {};
			});

		if (retry && headerFailure) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();

			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			headerFailure = false;
		}
	}

	return waypointJson;
}