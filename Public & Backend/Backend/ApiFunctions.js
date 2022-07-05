import wixFetch from 'wix-fetch';
import { createSecret, updateSecret, getSecret, listSecretInfo } from 'wix-secrets-backend';

import * as ApiConstants from 'public/Constants/ApiConstants.js';
import * as AuthenticationFunctions from 'backend/AuthenticationFunctions.jsw';
import * as InternalNotificationFunctions from 'backend/InternalNotificationFunctions.jsw';

// Retrieves the Spartan Token, either from HaloDotAPI or the SpartanToken secret with the following value format:
/* 
	{
		"Token": [SpartanToken],
		"Expiration": [ExpirationDatetime]
	}
*/
export async function getSpartanToken(refresh = true, code = "") { // The refresh argument is true by default and forces a new SpartanToken to be retrieved from the API.
	let spartanTokenJson; // This variable will contain the Json from our stored secret. 
	let tokenNeededFromApi = false; // If true, we need to get a new token from the API.
	let spartanToken = null; // This variable stores the returned token.

	let currentDatetimePlusTenMin = new Date((new Date()).getTime() + 60000); // We add 10 minute to the current datetime to make sure token expiration isn't coming immediately.

	// If it exists and hasn't expired, we can just return the token. If it has expired, we need to get a new one.
	try {
		spartanTokenJson = JSON.parse(await getSecret(ApiConstants.SECRETS_SPARTAN_TOKEN_KEY));
		let expirationDatetime = new Date(spartanTokenJson.Expiration); // The expiration datetime is stored within the JSON.

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
		// We're going to try performing the necessary steps to retrieve the Spartan Token in reverse order. If one fails, we go back a step and keep repeating this until we succeed.
		// If all else fails, we'll have to get the code manually from the URL provided by getAuthUrl() in the AuthenticationFunctions.jsw file. Make sure to use it with the Infinite News account.

		let secretInfo = await listSecretInfo()
			.catch((error) => {
				console.error(error + " occurred. Unable to retrieve secret info. Cannot proceed with retrieving Spartan Token.");
				throw "Fatal: Could not list secret info while retrieving Spartan Token.";
			});


		// We need a number of secret codes to generate the Spartan Token. It'll be fastest to get them all at once.
		let secretIdDict = {};
		const SECRET_KEY_ARRAY = [
			ApiConstants.SECRETS_XSTS_TOKEN_KEY, 		// Provided by the requestXstsToken() function.
			ApiConstants.SECRETS_USER_TOKEN_KEY,		// Provided by the requestUserToken() function.
			ApiConstants.SECRETS_ACCESS_TOKEN_KEY,		// Provided by the refreshOAuthToken() and requestOAuthToken() functions. (First should be prioritized over second.)
			ApiConstants.SECRETS_REFRESH_TOKEN_KEY,		// Provided by the refreshOAuthToken() and requestOAuthToken() functions. (First should be prioritized over second.)
			ApiConstants.SECRETS_AUTHORIZATION_CODE_KEY // Provided manually by using the getAuthUrl() function and copying the URL to a browser. Retrieved from the redirect URL.
		];

		secretInfo.forEach((item) => {
			if (SECRET_KEY_ARRAY.includes(item.name)) {
				secretIdDict[item.name] = item.id;
			}
		});

		let spartanTokenData = null;
		let currentStepIndex = 0; // We iterate through the steps outlined by the SECRET_KEY_ARRAY above. The higher the index, the earlier the step.

		let refreshNeeded = true;

		// This is a pretty clever solution. We put earlier steps toward the top, but skip over them until absolutely necessary to run them.
		while (!spartanTokenData) {
			//#region Retrieve Auth Token and Refresh Token from Microsoft using the Authorization Code.
			// If the currentStepIndex has met or exceeded the index of the step, we need to perform it.
			if (SECRET_KEY_ARRAY.indexOf(ApiConstants.SECRETS_AUTHORIZATION_CODE_KEY) <= currentStepIndex) {
				// We have exhausted all other means of authenticating later in the process. It's time to try authentication with the Authorization Code.
				// First, we try retrieving it from the Secrets API.
				try {
					let useCodeFromArgs = true; // This will become false if the secrets code works instead.
					if (ApiConstants.SECRETS_AUTHORIZATION_CODE_KEY in secretIdDict) {
						// We have an Authorization Code in the Secrets API, but it might not work. Let's try it first.
						let authorizationCode = await getSecret(ApiConstants.SECRETS_AUTHORIZATION_CODE_KEY);

						let oAuthTokenResults = await AuthenticationFunctions.requestOAuthToken(authorizationCode);

						if (oAuthTokenResults) {
							// We got something good from the request! Time to parse it and store it in our ACCESS_TOKEN and REFRESH_TOKEN secrets.
							let accessToken = oAuthTokenResults.access_token;
							let refreshToken = oAuthTokenResults.refresh_token;

							// We should update or create the secrets with these values to make sure we can access the right details in the future.
							if (ApiConstants.SECRETS_ACCESS_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_ACCESS_TOKEN_KEY], {
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}

							if (ApiConstants.SECRETS_REFRESH_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_REFRESH_TOKEN_KEY], {
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}

							refreshNeeded = false; // We don't need to refresh the OAuth token since we just retrieved it.
							useCodeFromArgs = false;
						}
					}
					
					if (useCodeFromArgs && code) {
						let authorizationCode = code;
						let oAuthTokenResults = await AuthenticationFunctions.requestOAuthToken(authorizationCode);

						if (oAuthTokenResults) {
							// We got something good from the request! Time to parse it and store it in our ACCESS_TOKEN and REFRESH_TOKEN secrets.
							let accessToken = oAuthTokenResults.access_token;
							let refreshToken = oAuthTokenResults.refresh_token;

							// We should update or create the secrets with these values to make sure we can access the right details in the future.
							if (ApiConstants.SECRETS_ACCESS_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_ACCESS_TOKEN_KEY], {
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}

							if (ApiConstants.SECRETS_REFRESH_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_REFRESH_TOKEN_KEY], {
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}

							refreshNeeded = false; // We don't need to refresh the OAuth token since we just retrieved it.
						}
						else {
							throw "Could not retrieve OAuth token with manually provided Auth Code or Auth Code from Secrets.";
						}
					}
					else if (useCodeFromArgs && !code) {
						throw "Could not retrieve OAuth token with Auth Code from Secrets.";
					}
				}
				catch(error) {
					console.error(error + " occurred while retrieving and storing OAuthToken data. Error is fatal.");
					InternalNotificationFunctions.notifyOwner("OAuth Token Failed", "Manually run the getAuthUrl() function, obtain the code returned by this URL, and manually run the getSpartanToken() function with this code.");
					throw error;
				}
			}
			//#endregion

			//#region Refresh access token using refresh token.
			// We also want to make sure that a refresh of the token is needed before doing this.
			if (SECRET_KEY_ARRAY.indexOf(ApiConstants.SECRETS_REFRESH_TOKEN_KEY) <= currentStepIndex && refreshNeeded) {
				try {
					// We'll only have a refresh token from the secrets API. If it isn't there, we need to generate it.
					if (ApiConstants.SECRETS_REFRESH_TOKEN_KEY in secretIdDict) {
						let refreshToken = await getSecret(ApiConstants.SECRETS_REFRESH_TOKEN_KEY);
						let oAuthTokenResults = await AuthenticationFunctions.refreshOAuthToken(refreshToken);

						if (oAuthTokenResults) {
							// We got something good from the request! Time to parse it and store it in our ACCESS_TOKEN and REFRESH_TOKEN secrets.
							let accessToken = oAuthTokenResults.access_token;
							let refreshToken = oAuthTokenResults.refresh_token;

							// We should update or create the secrets with these values to make sure we can access the right details in the future.
							if (ApiConstants.SECRETS_ACCESS_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_ACCESS_TOKEN_KEY], {
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_ACCESS_TOKEN_KEY,
									value: accessToken,
									description: "The Xbox OAuth Access Token."
								});
							}

							if (ApiConstants.SECRETS_REFRESH_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_REFRESH_TOKEN_KEY], {
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_REFRESH_TOKEN_KEY,
									value: refreshToken,
									description: "The Xbox OAuth Refresh Token."
								});
							}

							refreshNeeded = false; // We don't need to refresh the OAuth token since we just retrieved it.
						}
						else {
							throw "Refresh failed to produce a valid response from the server.";
						}
					}
					else {
						throw "Unable to find Refresh Token in the Secrets API.";
					}
				}
				catch (error) {
					console.warn(error + " occurred while refreshing OAuth token. Will try to generate it from the Authorization Code.");
					currentStepIndex++;
					continue;
				}
			}
			//#endregion

			//#region Get User Token using Access Token.
			if (SECRET_KEY_ARRAY.indexOf(ApiConstants.SECRETS_ACCESS_TOKEN_KEY) <= currentStepIndex) {
				try {
					// We'll only have an Access Token from the Secrets API. If it isn't there, we'll need to generate it.
					if (ApiConstants.SECRETS_ACCESS_TOKEN_KEY in secretIdDict) {
						let accessToken = await getSecret(ApiConstants.SECRETS_ACCESS_TOKEN_KEY);
						let userTokenResults = await AuthenticationFunctions.requestUserToken(accessToken);

						if (userTokenResults) {
							// We got something good from the request! Time to parse it and store it in our ACCESS_TOKEN and REFRESH_TOKEN secrets.
							let userToken = userTokenResults.Token;

							// We should update or create the secrets with these values to make sure we can access the right details in the future.
							if (ApiConstants.SECRETS_USER_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_USER_TOKEN_KEY], {
									name: ApiConstants.SECRETS_USER_TOKEN_KEY,
									value: userToken,
									description: "The Xbox User Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_USER_TOKEN_KEY,
									value: userToken,
									description: "The Xbox User Token."
								});
							}

							refreshNeeded = false; // We don't need to refresh the OAuth token since we just used it.
						}
						else {
							throw "Access token failed to produce a valid user token response from the server.";
						}
					}
					else {
						throw "Unable to find Access Token in the Secrets API.";
					}
				}
				catch (error) {
					console.warn(error + " occurred while retrieving User Token. Will try to generate a new Access Token from the Refresh Token.");
					currentStepIndex++;
					continue;
				}
			}
			//#endregion

			//#region Get XSTS Token using User Token.
			if (SECRET_KEY_ARRAY.indexOf(ApiConstants.SECRETS_USER_TOKEN_KEY) <= currentStepIndex) {
				try {
					// We'll only have a User Token from the Secrets API. If it isn't there, we'll need to generate it.
					if (ApiConstants.SECRETS_USER_TOKEN_KEY in secretIdDict) {
						let userToken = await getSecret(ApiConstants.SECRETS_USER_TOKEN_KEY);
						let xstsTokenResults = await AuthenticationFunctions.requestXstsToken(userToken); // We'll also use the Halo Relying Party by using the default true arg.

						if (xstsTokenResults) {
							// We got something good from the request! Time to parse it and store it in our ACCESS_TOKEN and REFRESH_TOKEN secrets.
							let xstsToken = xstsTokenResults.Token;

							// We should update or create the secrets with these values to make sure we can access the right details in the future.
							if (ApiConstants.SECRETS_XSTS_TOKEN_KEY in secretIdDict) {
								await updateSecret(secretIdDict[ApiConstants.SECRETS_XSTS_TOKEN_KEY], {
									name: ApiConstants.SECRETS_XSTS_TOKEN_KEY,
									value: xstsToken,
									description: "The XSTS Token."
								});
							}
							else {
								await createSecret({
									name: ApiConstants.SECRETS_XSTS_TOKEN_KEY,
									value: xstsToken,
									description: "The XSTS Token."
								});
							}

							refreshNeeded = false; // We don't need to refresh the OAuth token since we succeeded later in the process.
						}
						else {
							throw "User token failed to produce a valid XSTS Token response from the server.";
						}
					}
					else {
						throw "Unable to find User Token in the Secrets API.";
					}
				}
				catch (error) {
					console.warn(error + " occurred while retrieving XSTS Token. Will try to generate a new User Token from the Access Token.");
					currentStepIndex++;
					continue;
				}
			}
			//#endregion

			//#region Get Spartan Token using XSTS Token.
			if (SECRET_KEY_ARRAY.indexOf(ApiConstants.SECRETS_XSTS_TOKEN_KEY) <= currentStepIndex) {
				try {
					// We'll only have a User Token from the Secrets API. If it isn't there, we'll need to generate it.
					if (ApiConstants.SECRETS_XSTS_TOKEN_KEY in secretIdDict) {
						let xstsToken = await getSecret(ApiConstants.SECRETS_XSTS_TOKEN_KEY);
						spartanTokenData = await AuthenticationFunctions.generateSpartanToken(xstsToken); // We'll also use the Halo Relying Party by using the default true arg.

						if (!spartanTokenData) {
							throw "XSTS token failed to produce a valid Spartan Token response from the server.";
						}
					}
					else {
						throw "Unable to find XSTS Token in the Secrets API.";
					}
				}
				catch (error) {
					console.warn(error + " occurred while retrieving Spartan Token. Will try to generate a new XSTS Token from the User Token.");
					currentStepIndex++;
					continue;
				}
			}
		}

		// Now that we have our Spartan Token, we need to add it to the Secrets so we don't always have to perform this query.
		let secret = {
			name: ApiConstants.SECRETS_SPARTAN_TOKEN_KEY,
			value: JSON.stringify({
				"Token": spartanTokenData.SpartanToken,
				"Expiration": spartanTokenData.ExpiresUtc.ISO8601Date
			}),
			description: "Value needs to be parsed into JSON. The token is stored in Token, and the UTC expiration date is stored in Expiration."
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

		spartanToken = spartanTokenData.SpartanToken;

		// The API expects a post request for a Spartan token. The payload is JSON including the identifier, env, and version. The below are for Halo Infinite.
		/*let body = {
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
			*/
	}

	return spartanToken;
}

// Retrieves the 343 Clearance from Halo Waypoint.
export async function getClearance(spartanToken="") {
	if (!spartanToken) {
		spartanToken = await getSpartanToken(false);
	}

	// We use the API Key stored in our secrets to query the API.
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

	// Query the API. Note that the Authorization, Content-Type, and Cryptum-API-Version must all be provided.
	return await wixFetch
		.fetch(ApiConstants.WAYPOINT_URL_BASE_343_CLEARANCE + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX + ApiConstants.WAYPOINT_URL_SUFFIX_343_CLEARANCE_FLIGHT, {
			"headers": {
				[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER]: spartanToken
			}
		})
		.then((httpResponse) => {
			if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("Fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.then((json) => {
			return json.FlightConfigurationId;
		})
		.catch(err => {
			console.error(err);
		});
}

// Combines the Spartan Token and Clearance into a single JSON header object, along with other necessary headers.
export async function makeWaypointHeaders() {
	let spartanToken = await getSpartanToken(false);
	let clearance = await getClearance(spartanToken);

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
