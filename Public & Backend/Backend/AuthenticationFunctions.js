import wixFetch from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

import * as ApiConstants from 'public/Constants/ApiConstants.js';

// Provides a URL with the information necessary to generate a code for a manual sign-in. This needs to be copied into a browser, and the code should be extracted from the redirect URL.
export async function getAuthUrl(scopes = null, state = "") { // The refresh argument is true by default and forces a new SpartanToken to be retrieved from the API.
    let queryString = "";

    const CLIENT_ID = await getSecret(ApiConstants.SECRETS_AZURE_CLIENT_ID_KEY);

    queryString += "client_id=" + encodeURIComponent(CLIENT_ID);
    queryString += "&response_type=code";
    queryString += "&approval_prompt=auto";

    if (scopes != null && scopes.Length > 0)
    { 
        queryString += "&scope=" + encodeURIComponent(scopes.join(" "));
    }
    else
    {
        queryString += "&scope=Xboxlive.signin+Xboxlive.offline_access";
    }

    queryString += "&redirect_uri=" + encodeURIComponent(ApiConstants.AZURE_REDIRECT_URI);

    if (state)
    {
        queryString += "&state=" + encodeURIComponent(state);
    }

    return ApiConstants.XBOX_LIVE_AUTHORIZATION_BASE + "?" + queryString;
}

export async function requestOAuthToken(authorizationCode, scopes = null) {
    let requestBody = {};

    const CLIENT_ID = await getSecret(ApiConstants.SECRETS_AZURE_CLIENT_ID_KEY);

    requestBody["grant_type"] = "authorization_code";
    requestBody["code"] = encodeURIComponent(authorizationCode);
    requestBody["approval_prompt"] = "auto";

    if (scopes != null && scopes.Length > 0)
    { 
        requestBody["scope"] = encodeURIComponent(scopes.join(" "));
    }
    else
    {
        requestBody["scope"] = "Xboxlive.signin+Xboxlive.offline_access";
    }

    requestBody["redirect_uri"] = encodeURIComponent(ApiConstants.AZURE_REDIRECT_URI);
    requestBody["client_id"] = encodeURIComponent(CLIENT_ID);

    const CLIENT_SECRET = await getSecret(ApiConstants.SECRETS_AZURE_CLIENT_SECRET_KEY);

    requestBody["client_secret"] = encodeURIComponent(CLIENT_SECRET);

    let urlEncodedBody = "";

    for (let key in requestBody) {
        urlEncodedBody += key + "=" + requestBody[key] + "&";
    }

    urlEncodedBody = urlEncodedBody.substr(0, urlEncodedBody.length - 1); // Remove the last ampersand character.

    return await wixFetch
        .fetch(ApiConstants.XBOX_LIVE_TOKEN_BASE, {
            "method": "post",
            "body": urlEncodedBody,
            "headers": {
               'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then((httpResponse) => {
            if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("OAuth fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.catch(err => {
			console.error(err);
            return null;
		});
}

export async function refreshOAuthToken(refreshToken, scopes = null) {
    let requestBody = {};

    const CLIENT_ID = await getSecret(ApiConstants.SECRETS_AZURE_CLIENT_ID_KEY);

    requestBody["grant_type"] = "refresh_token";
    requestBody["refresh_token"] = encodeURIComponent(refreshToken);

    if (scopes != null && scopes.Length > 0)
    { 
        requestBody["scope"] = encodeURIComponent(scopes.join(" "));
    }
    else
    {
        requestBody["scope"] = "Xboxlive.signin+Xboxlive.offline_access";
    }

    requestBody["client_id"] = encodeURIComponent(CLIENT_ID);

    const CLIENT_SECRET = await getSecret(ApiConstants.SECRETS_AZURE_CLIENT_SECRET_KEY);

    requestBody["client_secret"] = encodeURIComponent(CLIENT_SECRET);

    let urlEncodedBody = "";

    for (let key in requestBody) {
        urlEncodedBody += key + "=" + requestBody[key] + "&";
    }

    urlEncodedBody = urlEncodedBody.substr(0, urlEncodedBody.length - 1); // Remove the last ampersand character.

    return await wixFetch
        .fetch(ApiConstants.XBOX_LIVE_TOKEN_BASE, {
            "method": "post",
            "body": urlEncodedBody,
            "headers": {
               'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then((httpResponse) => {
            if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("OAuth fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.catch(err => {
			console.error(err);
            return null;
		});
}

export async function requestUserToken(accessToken) {
    let requestBody = {};

    requestBody["RelyingParty"] = ApiConstants.XBOX_LIVE_AUTH_RELYING_PARTY;
    requestBody["TokenType"] = ApiConstants.XBOX_LIVE_USER_TOKEN_TYPE;
    requestBody["Properties"] = {
        "AuthMethod": "RPS",
        "SiteName": ApiConstants.XBOX_LIVE_AUTH_SITE_NAME,
        "RpsTicket": "d=" + accessToken
    }

    return await wixFetch
        .fetch(ApiConstants.XBOX_LIVE_USER_AUTHENTICATE_BASE, {
            "method": "post",
            "body": JSON.stringify(requestBody),
            "headers": {
               'Content-Type': 'application/json',
               "x-xbl-contract-version": "1"
            }
        })
        .then((httpResponse) => {
            if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("User token fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.catch(err => {
			console.error(err);
            return null;
		});
}

export async function requestXstsToken(userToken, useHaloRelyingParty = true) {
    let requestBody = {};

    requestBody["RelyingParty"] = (useHaloRelyingParty) ? ApiConstants.WAYPOINT_RELYING_PARTY : ApiConstants.XBOX_LIVE_RELYING_PARTY;
    requestBody["TokenType"] = ApiConstants.XBOX_LIVE_USER_TOKEN_TYPE;
    requestBody["Properties"] = {
        "UserTokens": [userToken],
        "SandboxId": "RETAIL"
    }

    return await wixFetch
        .fetch(ApiConstants.XBOX_LIVE_XSTS_BASE, {
            "method": "post",
            "body": JSON.stringify(requestBody),
            "headers": {
               'Content-Type': 'application/json',
               "x-xbl-contract-version": "1"
            }
        })
        .then((httpResponse) => {
            if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("XSTS token fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.catch(err => {
			console.error(err);
            return null;
		});
}

export function getXboxLiveV3Token(userHash, userToken) {
    return "XBL3.0 x=" + userHash + ";" + userToken;
}

export async function generateSpartanToken(xstsToken) {
    let requestBody = {};

    requestBody["Audience"] = ApiConstants.WAYPOINT_AUTH_AUDIENCE;
    requestBody["MinVersion"] = ApiConstants.WAYPOINT_AUTH_MIN_VERSION;
    requestBody["Proof"] = [{
        "Token": xstsToken,
        "TokenType": ApiConstants.WAYPOINT_AUTH_XSTS_TOKEN_TYPE
    }];

    return await wixFetch
        .fetch(ApiConstants.WAYPOINT_AUTH_SPARTAN_TOKEN_BASE, {
            "method": "post",
            "body": JSON.stringify(requestBody),
            "headers": {
               'Content-Type': 'application/json',
               'Accept': 'application/json'
            }
        })
        .then((httpResponse) => {
            if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("Spartan Token fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		})
		.catch(err => {
			console.error(err);
            return null;
		});
}

