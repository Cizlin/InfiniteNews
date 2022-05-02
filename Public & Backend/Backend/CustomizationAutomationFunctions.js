// This file contains all functions specific to Customization Import.

//#region Imports
// Import Wix functions and tools.
import wixFetch from 'wix-fetch';
import wixData from 'wix-data';
import { createSecret, updateSecret, getSecret, listSecretInfo } from 'wix-secrets-backend';
import { mediaManager } from 'wix-media-backend';

// Import 3rd party packages.
import structuredClone from '@ungap/structured-clone';

// Import Constants.
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as ApiConstants from 'public/Constants/ApiConstants.js';
import * as GeneralConstants from 'public/Constants/GeneralConstants.js';

import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';

// Import helper functions.
import * as WaypointFunctions from 'backend/WaypointBackendFunctions.jsw';
//#endregion

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
		.then( (httpResponse) => {
			if (httpResponse.ok) {
				return httpResponse.json();
			} else {
				return Promise.reject("Fetch did not succeed. Got HTTP Response: " + httpResponse.status);
			}
		} )
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
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					headerFailure = true;
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err + " occurred while fetching " + WAYPOINT_URL_BASE_PROGRESSION + path + ". Try " + (++retryCount) + " of " + maxRetries);
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

// Retrieves the list of Armor Cores from the Waypoint API.
async function getArmorCoreList(headers) {
	// Query the API.
	let retry = true;
	let waypointJson = {};

	while (retry) {
		waypointJson = await wixFetch.fetch(ApiConstants.WAYPOINT_URL_BASE_WAYPOINT + ApiConstants.WAYPOINT_URL_SUFFIX_WAYPOINT_ARMOR_CORE_LIST, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});

		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}

	return waypointJson;
}

// Retrieves a list of paths to owned Cores from the Waypoint API matching the customizationCategory. Ownership of Weapon, Vehicle, and AI Cores is guaranteed.
async function getCoreList(headers, customizationCategory) {
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

	let retry = true;
	let inventoryJson = {};

	let url = ApiConstants.WAYPOINT_URL_BASE_ECONOMY + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_ECONOMY_INVENTORY;

	while (retry) {
		inventoryJson = await wixFetch.fetch(url, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});
		
		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}
	
	// We have a list of every owned theme and a bunch of other owned items. Cores aren't really included in this, so we have to be clever. Let's get a list of matching themes first.
	let typeToFind = "";
	switch (customizationCategory) {
		case WeaponConstants.WEAPON_KEY: 
			typeToFind = WeaponConstants.WEAPON_THEME_WAYPOINT_TYPE;
			break;

		case VehicleConstants.VEHICLE_KEY:
			typeToFind = VehicleConstants.VEHICLE_THEME_WAYPOINT_TYPE;
			break;
		
		default:
			throw customizationCategory + " is not an allowed customization category. Exiting.";
	}

	// Time to fetch the themes matching our category
	let themeArray = [];
	inventoryJson.Items.forEach((item) => {
		if (item.ItemType == typeToFind) {
			themeArray.push(item.ItemPath);
		}
	});

	// Now that we have all the themes, we want to visit each one and extract the cores within.
	let corePathArray = [];
	for (let i = 0; i < themeArray.length; ++i) {
		let themeJson = await getCustomizationItem(headers, themeArray[i]);
		let themeParentArray = themeJson.CommonData.ParentPaths;
		for (let j = 0; j < themeParentArray.length; ++j) {
			// If we don't already have this core path, add it now.
			if (!corePathArray.includes(themeParentArray[j].Path)) {
				corePathArray.push(themeParentArray[j].Path);
			}
		}
	}

	// We got the corePaths. Time to return.

	return corePathArray;

}

// This function returns a list of themes for customization categories with no cores (currently only Body & AI).
async function getThemeList(headers, customizationCategory) {
	const XUID = await getSecret(ApiConstants.SECRETS_XUID_KEY);

	let retry = true;
	let inventoryJson = {};

	let url = ApiConstants.WAYPOINT_URL_BASE_ECONOMY + ApiConstants.WAYPOINT_URL_XUID_PREFIX + XUID + ApiConstants.WAYPOINT_URL_XUID_SUFFIX +
		ApiConstants.WAYPOINT_URL_SUFFIX_ECONOMY_INVENTORY;

	while (retry) {
		inventoryJson = await wixFetch.fetch(url, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				return {};
			});
		
		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;

			retry = false; // For now, let's just do a single retry after fixing the headers.
		}
	}
	

	// We have a list of every owned theme and a bunch of other owned items. Let's get a list of matching themes first.
	let typeToFind = "";
	switch (customizationCategory) {
		case BodyAndAiConstants.BODY_AND_AI_KEY: 
			typeToFind = BodyAndAiConstants.BODY_AND_AI_THEME_WAYPOINT_TYPE;
			break;
		
		default:
			throw customizationCategory + " is not an allowed customization category. Exiting.";
	}

	// Time to fetch the themes matching our category. There's probably only one, but you never know.
	let themeArray = [];
	inventoryJson.Items.forEach((item) => {
		if (item.ItemType == typeToFind) {
			themeArray.push(item.ItemPath);
		}
	});

	return themeArray;
}

export async function getSpartanIdPathList(headers, categorySpecificDictsAndArrays, waypointGroupsToProcess) {
	// Query the Waypoint API.
	if (!(categorySpecificDictsAndArrays) || categorySpecificDictsAndArrays.length != 2) { // We expect 2 dicts/arrays in this construct, even though we only really need 1.
		console.error("Unexpected length for categorySpecificDictsAndArrays. Expected 2, got ", categorySpecificDictsAndArrays.length);
	}

	let customizationTypeArray = categorySpecificDictsAndArrays[0]; // The customization types for this category.

	let inventoryCatalogJson = await getCustomizationItem(headers, ApiConstants.WAYPOINT_URL_SUFFIX_PROGRESSION_INVENTORY_CATALOG);

	let itemList = inventoryCatalogJson.Items;

	// Get an array of valid Waypoint Types from the customizationTypeArray.
	let validWaypointTypes = [];

	const SOCKET_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[SpartanIdConstants.SPARTAN_ID_KEY][SocketWaypointIdField];

	customizationTypeArray.forEach((type) => {
		// If the type is a valid Spartan ID type and we want to process it, include it in our array of valid types.
		if (type[SOCKET_WAYPOINT_ID_FIELD] != "N/A" && waypointGroupsToProcess.includes(type[SOCKET_WAYPOINT_ID_FIELD])) {
			validWaypointTypes.push(type[SOCKET_WAYPOINT_ID_FIELD]);
		}
	});

	let spartanIdPathArray = [];
	for (let i = 0; i < itemList.length; ++i) {
		if (itemList[i].ItemType in validWaypointTypes) {
			spartanIdPathArray.push(itemList[i].ItemPath);
		}
	}

	return spartanIdPathArray;
}

// Retrieves an item's JSON file from the Waypoint API. Returns the Wix URL to the stored image. This is returned as a Promise that resolves to the URL on success.
export async function addCustomizationImageToMediaManager(headers, waypointPath, mimeType, mediaManagerPath, fileName) {
	var https = require('https');

	let httpOptions = {
		headers: headers
	};

	return new Promise((resolve, reject) => {
		let request = https.get(ApiConstants.WAYPOINT_URL_BASE_IMAGE + waypointPath, httpOptions, (response) => {
			let { statusCode } = response;
			console.log(`statusCode: ${statusCode}`)

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

					//console.log(imageBuffer.byteLength);

					// Save the image to our desired path and with our desired name.
					let imageInfo = await mediaManager.upload(mediaManagerPath, imageBuffer, fileName, {
						"mediaOptions": {
							"mimeType": mimeType,
							"mediaType": "image"
						},
						"metadataOptions": {
							"isPrivate": false,
							"isVisitorUpload": false
						}
					});

					resolve(imageInfo.fileUrl);
				}
				catch (e) {
					console.error("Got error " + e + " while trying to upload image for " + fileName + ". Using placeholder image.");
					resolve(CustomizationConstants.PLACEHOLDER_IMAGE_URL);
				}
			})
		});

		request.on('error', error => {
			console.error(`Got error: ${error.message} while fetching image at ${waypointPath}. Using placeholder image.`);
			resolve(CustomizationConstants.PLACEHOLDER_IMAGE_URL);
		});

		request.end();
	});
}

// We need to be more efficient, so we're going to generate the entire folder tree all at once, then use the paths in the tree to locate each image.
export async function generateFolderDict() {
	// The folderDict will essentially be a hierarchical listing of the customization images folders. The ID of each folder is stored in _id, except for "/".
	// We will also store the files in this dictionary with the user-readable filename as the key (with . replaced by , since JSON) and the file Name as the value. 
	// Still need to fetch the file URL, but that should be quick. Speed. I am speed.

	console.log("Starting folder dict generation.");
	let folderDict = {  
		"/": { }
	};

	let rootFolderList = await mediaManager.listFolders();
	let parentFolderId = "";
	let customizationImageFolderName = "";
	rootFolderList.forEach((element) => {
		if (element.folderName == GeneralConstants.CUSTOMIZATION_ROOT_FOLDER) {
			folderDict["/"][element.folderName + "/"] = { "_id": element.folderId }
			parentFolderId = element.folderId;
			customizationImageFolderName = element.folderName;
		}
	});

	// Now that we're in the Customization Images folder, we need to get the list of folders within it.
	let customizationImagesFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
	let customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
	customizationImagesFileList.forEach((file) => {
		folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
	});

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;
		
		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		customizationCategoryFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;
			
			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			customizationTypeFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});
			
			let customizationCoreFolderName;
			for (let k = 0; k < customizationTypeFolderList.length; k++) {
				let coreElement = customizationTypeFolderList[k];
				// Big line below. Terribly sorry.
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][coreElement.folderName + "/"] = { "_id": coreElement.folderId }
				parentFolderId = coreElement.folderId;
				customizationCoreFolderName = coreElement.folderName;
			
				// And for attachments, the parent customization type...
				let customizationCoreFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
				let customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
				customizationCoreFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }
					
					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					customizationParentTypeFileList.forEach((file) => {
						// Even larger line here. :(
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, {"key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY, "value": folderDict});
			}
		})
}

// Retrieves an item's image URL based on the customizationCategory, customizationType, customizationCore (if applicable), parentCustomizationType (for attachments) path, and mimeType.
// The Customization Category can be one of the accepted category keys (e.g. ARMOR_KEY or BODY_AND_AI_KEY) and is used to select the folder within Customization Images to open.
// The Customization Type can be one of the valid customizationType values and is used to select the folder within "Customization Images/[Customization Category Folder]/"
//	It can also be ITEM_TYPES.core to signify that a core is being added.
// The Customization Core specifies the name of the core (e.g. "Yoroi"), which is necessary to place the image in "Customization Images/[Customization Category Folder]/[customizationCore]/"
// The Parent Customization Type is only used for attachments. It is needed to place the attachment image in 
//	"Customization Images/[Customization Category Folder]/[customizationCore]/[parentCustomizationType]"
// The waypointPath is the Waypoint filepath used to retrieve the image from Waypoint if necessary.
// The mimeType comes directly from the item JSON and is usually 'image/png'.
// The folderDict is a dictionary representing the file system's structure as of **:50 prior to the execution of this import.
// The headers are the standard items passed into any API access function.
// The title is the name of the item prior to sanitization.
// The categorySpecificDictsAndArrays are only used for the Customization Type array, which is only relevant for the Armor, Armor Attachment, Weapon, Vehicle, 
//	Body And AI, and Spartan ID categories.
export async function getCustomizationImageUrl(folderDict, headers, title, waypointPath, mimeType, customizationCategory, customizationType, customizationCore = null,
	parentCustomizationType = null, categorySpecificDictsAndArrays = null) {
	// We want to check and see if the file already exists. It will have a filename of the form "[title] [customizationType].png", e.g. Wild Kovan Armor Coating.png.
	// First, we start with the root folder and list all directories within it. We're looking for a folder entitled "Customization Images".

	// The file path has the form 
	// /Customization Images/
	// CUSTOMIZATION_CATEGORY_FOLDER_DICT[customizationCategory]/						If not Shop or Pass, else use SHOP_FOLDER or PASS_FOLDER, respectively.
	// CUSTOMIZATION_TYPE_FOLDER_DICT[customizationCategory][customizationType]/ 		If not Consumable, Emblem Palette, or Manufacturer
	// OR
	// [TypeFolderFromTypeDB]															If Armor, Weapon, Vehicle, Body & AI, or Spartan ID and not Core
	// OR
	// [CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreFolder]/					If Core.
	// customizationCore/ 																If not core agnostic or non-core
	// CUSTOMIZATION_TYPE_FOLDER_DICT[ArmorConstants.ARMOR_KEY][parentCustomizationType]/ If attachment
	// [title] [customizationType].png

	// Time to traverse our folder tree while building the file path.
	let subFolderDict = {}
	let folderExists = true;
	if ("/" in folderDict) {
		subFolderDict = folderDict["/"];
	}
	else {
		folderExists = false;
	}

	if (folderExists && (GeneralConstants.CUSTOMIZATION_ROOT_FOLDER + "/" in subFolderDict)) {
		subFolderDict = subFolderDict[GeneralConstants.CUSTOMIZATION_ROOT_FOLDER + "/"];
	}
	else {
		folderExists = false;
	}

	const CATEGORY_FOLDER = GeneralConstants.CUSTOMIZATION_CATEGORY_FOLDER_DICT[customizationCategory];
	if (folderExists && ((CATEGORY_FOLDER + "/") in subFolderDict)) {
		subFolderDict = subFolderDict[CATEGORY_FOLDER + "/"];
	}
	else {
		folderExists = false;
	}

	let mediaPath = "/" + GeneralConstants.CUSTOMIZATION_ROOT_FOLDER + "/" + CATEGORY_FOLDER + "/";
	// We don't proceed further if we are working with Consumables, Emblem Palettes, or Manufacturers.
	if (customizationCategory != ConsumablesConstants.CONSUMABLES_KEY &&
		customizationCategory != CustomizationConstants.EMBLEM_PALETTE_KEY &&
		customizationCategory != CustomizationConstants.MANUFACTURER_KEY) {

		// The types listed below all use the DB to store their folder information. We only use the constant dicts if we aren't working with them.
		if (!(CustomizationConstants.IS_CUSTOMIZATION_ARRAY.includes(customizationCategory))) {

			const TYPE_FOLDER = GeneralConstants.CUSTOMIZATION_TYPE_FOLDER_DICT[customizationCategory][customizationType];
			mediaPath = mediaPath + TYPE_FOLDER + "/";
			if (folderExists && ((TYPE_FOLDER + "/") in subFolderDict)) {
				subFolderDict = subFolderDict[TYPE_FOLDER + "/"];
			}
			else {
				folderExists = false;
			}
		}
		else if (customizationType == CustomizationConstants.ITEM_TYPES.core) { // Adding a Core means we won't have the categorySpecificDictsAndArrays yet.
			const CORE_FOLDER = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreFolder;
			mediaPath = mediaPath + CORE_FOLDER + "/";
			if (folderExists && ((CORE_FOLDER + "/") in subFolderDict)) {
				subFolderDict = subFolderDict[CORE_FOLDER + "/"];
			}
			else {
				folderExists = false;
			}
		}
		else {
			if (!(categorySpecificDictsAndArrays) || categorySpecificDictsAndArrays.length != 2) { // We expect 2 dicts/arrays in this construct, even though we only really need 1.
				console.error("Unexpected length for categorySpecificDictsAndArrays. Expected 2, got ", categorySpecificDictsAndArrays.length);
			}

			let customizationTypeArray = categorySpecificDictsAndArrays[0]; // The customization types for this category.

			// The folder matching the specified customization type.
			typeFolder = "";

			// We just need to find the first type matching our provided customizationType.
			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
			const TYPE_MEDIA_FOLDER_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketMediaFolderField;
			customizationTypeArray.some((type) => {
				if (customizationType == type[TYPE_NAME_FIELD]) {
					typeFolder = type[TYPE_MEDIA_FOLDER_FIELD];
					return true;
				}
			});

			mediaPath = mediaPath + typeFolder + "/";
			if (folderExists && ((typeFolder + "/") in subFolderDict)) {
				subFolderDict = subFolderDict[typeFolder + "/"];
			}
			else {
				folderExists = false;
			}

			if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory)) {
				let isCrossCore = false;

				const TYPE_IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsCrossCoreField;

				customizationTypeArray.some((type) => {
					// If our matching type is cross-core, mark our flag true and exit.
					if (type[TYPE_IS_CROSS_CORE_FIELD] && type[TYPE_NAME_FIELD] == customizationType) {
						isCrossCore = true;
						return true;
					}
				})

				if (!isCrossCore) {
					mediaPath = mediaPath + customizationCore + "/";
					if (folderExists && ((customizationCore + "/") in subFolderDict)) {
						subFolderDict = subFolderDict[customizationCore + "/"];
					}
					else {
						folderExists = false;
					}

					if (CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
						let parentTypeFolder = "";

						// We just need to find the first type matching our provided customizationType.
						const TYPE_PARENT_MEDIA_FOLDER = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketParentMediaFolderField;

						customizationTypeArray.some((type) => {
							if (customizationType == type.name) {
								parentTypeFolder = type[TYPE_PARENT_MEDIA_FOLDER];
								return true;
							}
						});

						mediaPath = mediaPath + parentTypeFolder + "/";
						if (folderExists && ((parentTypeFolder + "/") in subFolderDict)) {
							subFolderDict = subFolderDict[parentTypeFolder + "/"];
						}
						else {
							folderExists = false;
						}
					}
				}
			}
		}
	}

	
	//console.log("Item Directory Path: " + mediaPath);

	let fileSystemSafeTitle = title.replace(/[\\\/\?:]/g, "_"); // Clean out some of the common illegal characters (\, /, ?, :).
	let filenameType = (customizationCategory == ShopConstants.SHOP_KEY) ? "Bundle" : customizationType;

	if (folderExists) {
		//console.log("Directory Path found.");

		let fileKey = fileSystemSafeTitle.replace(/\./g, ",") + " " + filenameType + ",png";

		if (fileKey in subFolderDict) {
			//console.log("Existing File found for " + fileKey);
			let fileData = await mediaManager.getFileInfo(subFolderDict[fileKey]);
			return fileData.fileUrl;
		}
		else {
			console.log("File not found for " + fileKey + " in " + mediaPath);
		}
	}
	else {
		// If the directory didn't exist before, we need to make it by adding the image.
		console.log("Directory not found for " + mediaPath + ".");
	}

	return await addCustomizationImageToMediaManager(headers, waypointPath, mimeType, mediaPath, fileSystemSafeTitle + " " + filenameType + ".png");
}

// This function compares the contents of two arrays and returns true if the contents match, regardless of order.
// Graciously provided by Maciej Krawczyk at https://stackoverflow.com/questions/6229197/how-to-know-if-two-arrays-have-the-same-values
function arrayCompare(_arr1, _arr2) {
    if (
      !Array.isArray(_arr1)
      || !Array.isArray(_arr2)
      || _arr1.length !== _arr2.length
      ) {
        return false;
      }
    
    // .concat() to not mutate arguments
    const arr1 = _arr1.concat().sort();
    const arr2 = _arr2.concat().sort();
    
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
         }
    }
    
    return true;
}

export function getCurrentDateTimeString() {
	var today = new Date();
	var monthString = (today.getMonth() + 1).toString();
	while (monthString.length < 2) {
		monthString = "0" + monthString;
	}

	var dateString = today.getDate().toString();
	while (dateString.length < 2) {
		dateString = "0" + dateString;
	}

	var yearString = today.getFullYear().toString();

	var hourString = today.getHours().toString();
	while (hourString.length < 2) {
		hourString = "0" + hourString;
	}

	var minuteString = today.getMinutes().toString();
	while (minuteString.length < 2) {
		minuteString = "0" + minuteString;
	}
	
	var secondString = today.getSeconds().toString();
	while (secondString.length < 2) {
		secondString = "0" + secondString;
	}

	var date = monthString + '-' + dateString + '-' + yearString;
	var time = hourString + ":" + minuteString + ":" + secondString;
	return date + " " + time;
}

// This function takes care of the Needs Review boolean flag and adds a new entry to the Change Log. It changes the original Json's Changelog only.
function markItemAsChanged(itemJson, originalJson, fieldChanged, customizationCategory, isCore = false) {
	let needsReviewField = "";
	if (isCore) {
		needsReviewField = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNeedsReviewField;
	}
	else {
		needsReviewField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNeedsReviewField;
	}
	itemJson[needsReviewField] = true;
	
	var datetime = getCurrentDateTimeString();

	let changeLogField = "";
	if (isCore) {
		changeLogField = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreChangeLogField;
	}
	else {
		changeLogField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationChangeLogField;
	}

	if (originalJson[changeLogField]) {
		originalJson[changeLogField].unshift(datetime + ": Changed " + fieldChanged + ", Was: " + originalJson[fieldChanged] + ", Is: " + itemJson[fieldChanged]);
		itemJson[changeLogField] = originalJson[changeLogField];
	}
	else {
		originalJson[changeLogField] = [(datetime + ": Changed " + fieldChanged + ", Was: " + originalJson[fieldChanged] + ", Is: " + itemJson[fieldChanged])];
		itemJson[changeLogField] = originalJson[changeLogField];
	}

	return [itemJson, originalJson]; // We need to return both Json objects in an array to be able to save our changelog.
}

// This function returns an array of assorted dictionaries that can be used instead of repeat queries.
// [0]: qualityDict
// [1]: releaseDict
// [2]: manufacturerArray (index aligns with Waypoint ID num)
// [3]: sourceTypeDict
// [4]: eTagDict
export async function getGeneralDictsAndArraysFromDbs(headers) {
	let qualityDict = {}; // The keys will be quality values (e.g. "Epic" or "Legendary"), and the values will be quality IDs.
	await wixData.query(CustomizationConstants.QUALITY_DB)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				for (let i = 0; i < results.items.length; ++i) {
					qualityDict[results.items[i].quality] = results.items[i]._id;
				}
			}
			else {
				throw "No quality values found in the DB! Major emergency!";
			}
		});

	// Next, we do the release.
	let releaseDict = {}; // The keys will be release names (e.g. "Season 1"), and the values are the associated IDs.
	await wixData.query(CustomizationConstants.RELEASE_DB)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				for (let i = 0; i < results.items.length; ++i) {
					releaseDict[results.items[i].release] = results.items[i]._id;
				}
			}
			else {
				throw "No release values found in the DB! Major emergency!";
			}
		});

	// Finally, we do the manufacturer. This one's unique and assumes that the manufacturers returned by this query exactly match those in metadata/Metadata.json.
	let manufacturerArray = [];
	await wixData.query(CustomizationConstants.MANUFACTURER_DB)
		.ascending(CustomizationConstants.MANUFACTURER_FIELD)
		.ne(CustomizationConstants.MANUFACTURER_FIELD, "(Pending)") // These two manufacturers were added manually and should not be included.
		.ne(CustomizationConstants.MANUFACTURER_FIELD, "N/A")
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				//console.log(results.items);
				for (let i = 0; i < results.items.length; ++i) {
					manufacturerArray.push(results.items[i]._id);
				}
			}
			else {
				throw "No manufacturers returned. This ain't good.";
			}
		});

	// We're adding another query for the source types.
	let sourceTypeDict = {}; // The keys will be source type names and the values are the associated IDs.
	await wixData.query(CustomizationConstants.SOURCE_TYPE_DB)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				for (let i = 0; i < results.items.length; ++i) {
					sourceTypeDict[results.items[i].name] = results.items[i]._id;
				}
			}
			else {
				throw "No release values found in the DB! Major emergency!";
			}
		});

	// We want to make a dictionary with Waypoint IDs as keys and the ETags from the guide/xo endpoints as values.
	let retry = true;
	let retryCount = 0;
	const maxRetries = 10;

	let guideJson = {}; // The JSON that will contain our guide details.
	let eTagDict = {}; // A dictionary with Waypoint IDs as keys and ETags as values. Used to see if an item needs updating.

	while (retry && retryCount < maxRetries) {
		console.log("Fetching guide/xo JSON at " + ApiConstants.WAYPOINT_URL_GUIDE);
		guideJson = await wixFetch.fetch(ApiConstants.WAYPOINT_URL_GUIDE, {
				"method": "get",
				"headers": headers
			})
			.then( (httpResponse) => {
				if (httpResponse.ok) {
					retry = false;
					return httpResponse.json();
				} 
				else { // We want to retry once with updated headers if we got an error.
					console.warn("Headers did not work. Try " + (++retryCount) + " of " + maxRetries + "... " +
						"Got HTTP response " + httpResponse.status + ": " + httpResponse.statusText + " when trying to retrieve from " + httpResponse.url);
					return {};
				}
			} )
			.then((json) => {
				return json;
			})
			.catch(err => {
				console.error(err);
				throw "Unable to obtain guide/xo JSON from Waypoint. Aborting...";
			});
		
		if (retry) { // We need to remake the headers, but we do it by adjusting the actual contents of the JSON.
			let spartanToken = await getSpartanToken();
			let clearance = await getClearance();
			
			headers[ApiConstants.WAYPOINT_SPARTAN_TOKEN_HEADER] = spartanToken;
			headers[ApiConstants.WAYPOINT_343_CLEARANCE_HEADER] = clearance;
		}
	}

	for (let i = 0; i < guideJson.Files.length; ++i) {
		let file = guideJson.Files[i];
		let extractedMatchArray = file.Uri.Path.match(GeneralConstants.REGEX_WAYPOINT_ID_FROM_PATH); // An array containing all matches in the Path string. Should be the Waypoint ID if it's valid.

		if (extractedMatchArray && extractedMatchArray.length > 0) {
			// There will only be one match.
			let waypointId = extractedMatchArray[0];
			eTagDict[waypointId] = file.ETag;
			//console.log(waypointId + " has ETag " + file.ETag);
		}
		/*else {
			console.log("Skipping " + file.Uri.Path);
		}*/
	}
	
	return [qualityDict, releaseDict, manufacturerArray, sourceTypeDict, eTagDict];
}

// This must execute only after all the cores have been added to the DB. It returns the type array and core ID dict:
// [0]: customizationTypeArray
// [1]: coreIdDict (keys are core Waypoint IDs, values are _ids)
export async function getCategorySpecificDictsAndArraysFromDbs(customizationCategory) {
	let customizationTypeArray = [];
	// We have a bunch of useful information in the DB now. Let's get it all at once.
	const SOCKET_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketDb;

	let socketQuery = wixData.query(SOCKET_DB);

	if (CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
		const PARENT_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketParentTypeReferenceField;
		socketQuery = socketQuery.include(PARENT_TYPE_REFERENCE_FIELD);
	}
	await socketQuery.find()
		.then((results) => {
			if (results.items.length > 0) {
				customizationTypeArray = results.items;
			}
			else {
				throw "No customization types found for category " + customizationCategory;
			}
		});
	
	// Now that we have the matching customization type ID, we need to get a list of core items matching the contents of our core array.
	// Luckily, the site and Waypoint align on the naming convention (quite intentionally).
	let coreIdDict = {};
	if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && customizationCategory != ArmorConstants.ARMOR_ATTACHMENT_KEY) {
		const CORE_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreDb;
		await wixData.query(CORE_DB)
			.find()
			.then((results) => {
				if (results.items.length > 0) {
					const CORE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreWaypointIdField;
					for (let i = 0; i < results.items.length; i++) {
						let coreWaypointId = results.items[i][CORE_WAYPOINT_ID_FIELD];
						coreIdDict[coreWaypointId] = results.items[i]._id;
					}
				}
				else {
					throw "Did not return any items from the core DB. DEFCON 1!!!";
				}
			});
	}


	return [customizationTypeArray, coreIdDict];
}

// This function will use the following logic:
// If item exists in DB (check Waypoint ID)
// 	   Compare each existing value with the new value. If not matching:
// 	       Replace existing with new (except for source, sourcetype, image, currentlyAvailable, hidden (if false)) 
//         Log all changes to changeLog entry for item.
//         Mark item as "Needs Review".
// Otherwise
//     Add item to DB.
//	   Log item as added.
//     Mark item as "Needs Review".
// It's more efficient to add items all at once, so this will just assemble the JSON needed to add an item to the DB. If it returns -1, an error occurred.
// customizationCategory: One of the following: "Armor", "Weapon", "Vehicle", "BodyAndAi", "SpartanId", "Consumable"
// customizationDetails: A dictionary object containing each of the properties of the item to be added:
/*
	{
		"Title": [itemName],
		"Type": [waypointType],
		"MediaPath": [waypointImagePath],
		"MimeType": [waypointMimeType],
		"Cores": [coreObjectArray], // Only available on core-based customizations. Is an array to support cross-core pieces. Will only include "Any" if piece is fully cross-core.
		"Quality": [qualityName],
		"Description": [lore],
		"ManufacturerId": [manufacturerIndex], // The index of the manufacturer when all are listed in alphabetical order.
		"Season": [release],
		"RewardTrack": [waypointPassPath], // This may be null or the empty string. If it exists, it can be used to generate the source.
		"CustomAvailability": [source], // This is almost always null or the empty string.
		"HideUntilOwned": [hidden], // This will usually be honored, except in the case of promo items.
		"Attachments": [attachmentArray] // Contains an array of attachment Waypoint IDs that apply to this item. Parent item needs to be added after the attachments are added to the DB.
		"ParentType": [parentWaypointType] // This should only really be used for attachment items.
		"WaypointId": [waypointId] // We're going to be relating items in the database with the Waypoint ID, so we should start adding it.
		"IsKitItem": [isKitItem] // If this is true, this item was found as a child of a Kit.
		"ChildItems": [kitChildItemArray],
		"ChildAttachments": [kitChildAttachmentArray],
		"EmblemPalettes": [emblemPaletteDbIdArray] // This is only populated for emblems, and it allows the child Emblem Palettes to be linked.
	}
*/
// forceCheck: If this is true, then full comparison processing will be performed, even if the ETag matches (this is necessary for items with attachments since 
// those relations aren't made in the item's JSON).
export async function getCustomizationItemToSave(folderDict, headers, customizationCategory, customizationDetails, generalDictsAndArrays, categorySpecificDictsAndArrays, forceCheck = false) {
	// If we don't have variables defined for the customization category, we need to get out now. Everything will break otherwise.
	if(!(customizationCategory in CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS)) {
		console.error("Invalid customizationCategory value: " + customizationCategory);
		return -1;
	}
	else if (!(generalDictsAndArrays) || generalDictsAndArrays.length != 5) { // We expect 5 dicts/arrays in this construct.
		console.error("Unexpected length for generalDictsAndArrays. Expected 5, got ", generalDictsAndArrays.length);
	}
	else if (!(categorySpecificDictsAndArrays) || categorySpecificDictsAndArrays.length != 2) { // We expect 2 dicts/arrays in this construct.
		console.error("Unexpected length for categorySpecificDictsAndArrays. Expected 2, got ", categorySpecificDictsAndArrays.length);
	}

	// Extract the dicts and array from generalDictsAndArrays.
	// [0]: qualityDict
	// [1]: releaseDict
	// [2]: manufacturerArray (index aligns with Waypoint ID num)
	// [3]: sourceTypeDict
	// [4]: eTagDict
	let qualityDict = generalDictsAndArrays[0];
	let releaseDict = generalDictsAndArrays[1];
	let manufacturerArray = generalDictsAndArrays[2];
	let sourceTypeDict = generalDictsAndArrays[3];
	let eTagDict = generalDictsAndArrays[4];

	// Extract the dict and array from categorySpecificDictsAndArrays.
	// [0]: customizationTypeArray
	// [1]: coreIdDict
	let customizationTypeArray = categorySpecificDictsAndArrays[0];
	let coreIdDict = categorySpecificDictsAndArrays[1];

	// It's time to select the item!
	let existingItem = {};

	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	let matchingItemQuery = wixData.query(CUSTOMIZATION_DB)
		.eq(WAYPOINT_ID_FIELD, customizationDetails.WaypointId);

	if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {
		// Include the Core field.
		const CUSTOMIZATION_CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
		matchingItemQuery = matchingItemQuery.include(CUSTOMIZATION_CORE_REFERENCE_FIELD);
	}

	let retry = true;
	let retryCount = 0;
	const maxRetries = 10;

	while (retry && retryCount < maxRetries) {
		const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;
		await matchingItemQuery.find()
			.then((results) => {
				retry = false;

				if (results.items.length == 1) { // This is the expected case, assuming Waypoint IDs are unique.
					existingItem = results.items[0]; // We just need to store it for the moment.
				}
				else if (results.items.length > 1) { // This is unexpected. Put a warning in the logs, but we can still work on the first item.
					console.warn("Multiple items returned for the same Waypoint ID. Continuing, but watch for duplicates for " + WAYPOINT_ID_FIELD);
					existingItem = results.items[0]; // We'll still just work on the first item, but throwing a warning tells us to look for duplicates.
				}
				else {
					existingItem = null;
				}
			})
			.catch ((error) => {
				console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
			});
	}

	if (retry) {
		// We did not successfully pull data from the DB within 10 tries. Need to abort to avoid data poisoning.
		return -1;
	}

	// Check to see if the ETag has changed, suggesting the item itself has changed.
	if (existingItem 
		&& existingItem.itemETag 
		&& existingItem.itemETag != "" 
		&& existingItem.itemETag == eTagDict[customizationDetails.WaypointId]
		&& !forceCheck) {
		
		// The ETag is identical. No need to process further.
		return 1;
	}

	// We need to get the corresponding IDs for the reference fields. Let's begin with customizationTypeReference.

	// We had our own customization type setup long before we knew theirs. Let's convert it using our array!
	let customizationType = null; // The full customizationType object for the item.
	if (!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) { // No need to do this for attachments.
		const TYPE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointIdField;

		customizationTypeArray.some((type) => {
			if (type[TYPE_WAYPOINT_ID_FIELD] == customizationDetails.Type) {
				// We want to keep the full item so we can fetch any necessary configs.
				customizationType = type;
				return true;
			}
		});

		if (!(customizationType)) {
			console.error("Unable to resolve type for " + customizationDetails.Type + " within " + customizationCategory);
			return -1;
		}
	}
	
	
	// Now that we have the matching customization type ID, we need to get a list of core items matching the contents of our core array.
	let coreIdArray = [];
	if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {
		customizationDetails.Cores.forEach((core) => {
			if (core.waypointId in coreIdDict) {
				coreIdArray.push(coreIdDict[core.waypointId]);
			}
		});
	}

	// We need to convert the array of attachment names to an array of attachment IDs. This one is probably best to filter first.
	// TODO: Consider whether this would be worth including as a dict that gets passed in (would need to be generated after all attachments are added but before items using attachments).
	let attachmentIdArray = [];
	if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
		const HAS_ATTACHMENTS_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasAttachmentsField;

		if (customizationType[HAS_ATTACHMENTS_FIELD] && customizationDetails.Attachments && customizationDetails.Attachments.length > 0) {
			const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].AttachmentKey;

			const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationWaypointIdField;
			const ATTACHMENTS_CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;

			let retry = true;
			let retryCount = 0;
			const maxRetries = 10;

			while (retry && retryCount < maxRetries) {
				await wixData.query(ATTACHMENTS_CUSTOMIZATION_DB)
					.hasSome(WAYPOINT_ID_FIELD, customizationDetails.Attachments)
					.find()
					.then((results) => {
						retry = false;

						if (results.items.length > 0) {
							for (let i = 0; i < results.items.length; i++) {
								//console.log(results.items[i].itemName);
								attachmentIdArray.push(results.items[i]._id);
							}
						}
						else {
							throw "Did not return any matching attachments from the attachment DB. Was looking for " + customizationDetails.Attachments.toString();
						}
					})
					.catch ((error) => {
						console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
					});
			}

			if (retry) {
				return -1;
			}
		}
	}

	let kitItemIdArray = [];
	let kitAttachmentIdArray = [];
	if (CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
		const IS_KIT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsKitField;

		if (customizationType[IS_KIT_FIELD]) {
			if (customizationDetails.ChildItems && customizationDetails.ChildItems.length > 0) {

				const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;
				const CUSTOMIZATION_DB = CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;

				let retry = true;
				let retryCount = 0;
				const maxRetries = 10;

				while (retry && retryCount < maxRetries) {
					await wixData.query(CUSTOMIZATION_DB)
						.hasSome(WAYPOINT_ID_FIELD, customizationDetails.ChildItems)
						.find()
						.then((results) => {
							retry = false;

							if (results.items.length > 0) {
								for (let i = 0; i < results.items.length; i++) {
									//console.log(results.items[i].itemName);
									kitItemIdArray.push(results.items[i]._id);
								}
							}
							else {
								throw "Did not return any matching Kit items from the customization DB. Was looking for " + customizationDetails.ChildItems.toString();
							}
						})
						.catch((error) => {
							console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
						});
				}

				if (retry) {
					return -1;
				}
			}

			// If we have attachments to add to this kit.
			if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory) &&
				customizationDetails.ChildAttachments && customizationDetails.ChildAttachments.length > 0) {

				const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].AttachmentKey;

				const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationWaypointIdField;
				const ATTACHMENTS_CUSTOMIZATION_DB = CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[ATTACHMENT_KEY].CustomizationDb;

				let retry = true;
				let retryCount = 0;
				const maxRetries = 10;

				while (retry && retryCount < maxRetries) {
					await wixData.query(ATTACHMENTS_CUSTOMIZATION_DB)
						.hasSome(WAYPOINT_ID_FIELD, customizationDetails.Attachments)
						.find()
						.then((results) => {
							retry = false;

							if (results.items.length > 0) {
								for (let i = 0; i < results.items.length; i++) {
									//console.log(results.items[i].itemName);
									kitAttachmentIdArray.push(results.items[i]._id);
								}
							}
							else {
								throw "Did not return any matching Kit items from the attachment DB. Was looking for " + customizationDetails.ChildAttachments.toString();
							}
						})
						.catch((error) => {
							console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
						});
				}

				if (retry) {
					return -1;
				}
			}
		}
	}
	
	// We learned about the .include() function, so we can just iterate over each item in our core array to get the IDs. (Die query!!!)
	let originalCoreIds = [];
	if (existingItem &&
		HAS_CORE_ARRAY.includes(customizationCategory) &&
		!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {

		const CUSTOMIZATION_CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;

		let coreItemArray = existingItem[CUSTOMIZATION_CORE_REFERENCE_FIELD];
		for (let i = 0; i < coreItemArray.length; ++i) {
			originalCoreIds.push(coreItemArray[i]._id);
		}
		existingItem[CUSTOMIZATION_CORE_REFERENCE_FIELD] = originalCoreIds; // This replaces the entire object array with just a string Array.
	}

	// We need to get the attachment multi-reference field separately through a queryReferenced command because query doesn't return it.
	// When choosing between getting the core and the attachments, it was clear which would be the better choice.
	let originalAttachmentIds = [];
	if (existingItem && CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
		const HAS_ATTACHMENTS_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasAttachmentsField;

		if (customizationType[HAS_ATTACHMENTS_FIELD]) {
			const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
			const CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAttachmentReferenceField;

			let retry = true;
			let retryCount = 0;
			const maxRetries = 10;

			while (retry && retryCount < maxRetries) {
				await wixData.queryReferenced(CUSTOMIZATION_DB, existingItem._id, CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD)
					.then((results) => {
						retry = false;

						if (results.items.length > 0) {
							// Push each ID onto the array.
							results.items.forEach((item) => {
								originalAttachmentIds.push(item._id);
							})
						}
						/*else {
							console.log("No Attachments found for existing item: ", existingItem);
						}*/
					})
					.catch((error) => {
						console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
					});
			}

			if (retry) {
				return -1;
			}

			existingItem[CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD] = originalAttachmentIds;
		}
	}

	// We need to get the Kit items multi-reference field separately through a queryReferenced command because query doesn't return it.
	let originalKitItemIds = [];
	let originalKitAttachmentIds = [];
	if (existingItem && CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
		const IS_KIT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsKitField;

		if (customizationType[IS_KIT_FIELD]) {
			const CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitItemReferenceField;
			const CUSTOMIZATION_DB = CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;

			let retry = true;
			let retryCount = 0;
			const maxRetries = 10;

			while (retry && retryCount < maxRetries) {
				await wixData.queryReferenced(CUSTOMIZATION_DB, existingItem._id, CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD)
					.then((results) => {
						retry = false;

						if (results.items.length > 0) {
							// Push each ID onto the array.
							results.items.forEach((item) => {
								originalKitItemIds.push(item._id);
							});
						}
					})
					.catch((error) => {
						console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
					});
			}

			if (retry) {
				return -1;
			}

			existingItem[CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD] = originalKitItemIds;

			// If we have attachments to add to this kit.
			if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
				const CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitAttachmentReferenceField;

				let retry = true;
				let retryCount = 0;
				const maxRetries = 10;

				while (retry && retryCount < maxRetries) {
					await wixData.queryReferenced(CUSTOMIZATION_DB, existingItem._id, CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD)
						.then((results) => {
							retry = false;

							if (results.items.length > 0) {
								// Push each ID onto the array.
								results.items.forEach((item) => {
									originalKitAttachmentIds.push(item._id);
								});
							}
						})
						.catch((error) => {
							console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
						});
				}

				if (retry) {
					return -1;
				}

				existingItem[CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD] = originalKitAttachmentIds;
			}
		}
	}

	// We need to query the Emblem Palettes if we're adding some.
	let originalEmblemPaletteIds = [];
	if (existingItem && CustomizationConstants.HAS_EMBLEM_PALETTES_ARRAY.includes(customizationCategory)) {
		const HAS_PALETTES_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasPalettesField;

		if (customizationType[HAS_PALETTES_FIELD]) {
			const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
			const CUSTOMIZATION_PALETTE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].EmblemPaletteReferenceField;

			let retry = true;
			let retryCount = 0;
			const maxRetries = 10;

			while (retry && retryCount < maxRetries) {
				await wixData.queryReferenced(CUSTOMIZATION_DB, existingItem._id, CUSTOMIZATION_PALETTE_REFERENCE_FIELD)
					.then((results) => {
						retry = false;

						if (results.items.length > 0) {
							// Push each ID onto the array.
							results.items.forEach((item) => {
								originalEmblemPaletteIds.push(item._id);
							});
						}
					})
					.catch((error) => {
						console.error(error + " occurred. Try " + (++retryCount) + " of " + maxRetries + "...");
					});
			}

			if (retry) {
				return -1;
			}

			existingItem[CUSTOMIZATION_PALETTE_REFERENCE_FIELD] = originalEmblemPaletteIds;
		}
	}

	// The next step is to compare the current item with things in our arguments, but we need to translate some names into IDs, namely for quality, manufacturer, and release.
	// Let's start with quality.
	let qualityId = qualityDict[customizationDetails.Quality];

	// Next, we do the release.
	let releaseId = releaseDict[customizationDetails.Season];

	// Finally, we do the manufacturer.
	let manufacturerId = manufacturerArray[customizationDetails.ManufacturerId];

	let itemJsonToInsert = {};

	// If we found an existing item, we need to compare some of the existing fields with the new ones to see if it should be added.
	//console.log(existingItem);
	if (existingItem) {
		//console.log ("Updating existing item.");

		let itemJson = structuredClone(existingItem); // We start with the original fields in the item, but we need to make a copy.
		let changed = false; // If the item is changed this flag will be made true. Allows us to avoid adding unnecessary JSONs to our DB array.

		const CUSTOMIZATION_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;
		if (!itemJson[CUSTOMIZATION_WAYPOINT_ID_FIELD] || itemJson[CUSTOMIZATION_WAYPOINT_ID_FIELD] == "") {
			itemJson[CUSTOMIZATION_WAYPOINT_ID_FIELD] = customizationDetails.WaypointId; // We're saving the Waypoint ID here.
			changed = true;
		}

		const CUSTOMIZATION_ITEM_E_TAG_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationItemETagField;
		if (customizationDetails.WaypointId in eTagDict && itemJson[CUSTOMIZATION_ITEM_E_TAG_FIELD] != eTagDict[customizationDetails.WaypointId]) {
			// If the Waypoint ID exists in the ETag Dictionary and doesn't have a matching record to our DB entry.
			itemJson.itemETag = eTagDict[customizationDetails.WaypointId];
			changed = true;
		}

		const CUSTOMIZATION_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField;
		if (itemJson[CUSTOMIZATION_NAME_FIELD] != customizationDetails.Title) {
			itemJson[CUSTOMIZATION_NAME_FIELD] = customizationDetails.Title;

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_NAME_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		if (!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {
			const CUSTOMIZATION_SOCKET_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
			if (itemJson[CUSTOMIZATION_SOCKET_REFERENCE_FIELD] != customizationType._id) {
				itemJson[CUSTOMIZATION_SOCKET_REFERENCE_FIELD] = customizationType._id;

				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_SOCKET_REFERENCE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];
			}
		}

		const IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsCrossCoreField;
		if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !customizationType[IS_CROSS_CORE_FIELD]) { // If we have a non-cross-core customization type.
			// Note that this means we'll be storing cross-core items in random core-specific folders for now. TODO: Find a better option if this becomes problematic in the future.
			let parentSiteType = null; // This only applies to attachments that have parent items (e.g. for Helmet Attachments, this will be "Helmet")
			if ("ParentType" in customizationDetails && CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
				const PARENT_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketParentTypeReferenceField;
				const PARENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].ParentKey;
				const PARENT_SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[PARENT_KEY].SocketNameField;

				parentSiteType = customizationType[PARENT_TYPE_REFERENCE_FIELD][PARENT_SOCKET_NAME_FIELD];
			}
			else if (CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
				// We need to know the parent item but it wasn't supplied. Time to die.
				console.error("Parent item not supplied for attachment " + customizationDetails.Title);
				return -1;
			}

			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
			let siteCustomizationType = customizationType[TYPE_NAME_FIELD];

			let newImageUrl = await getCustomizationImageUrl(
				folderDict,
				headers,
				customizationDetails.Title,
				customizationDetails.MediaPath,
				customizationDetails.MimeType,
				customizationCategory,
				siteCustomizationType,
				customizationDetails.Cores[0].name,
				parentSiteType,
				categorySpecificDictsAndArrays);

			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationImageField;

			if (existingItem[CUSTOMIZATION_IMAGE_FIELD] != newImageUrl) {
				itemJson[CUSTOMIZATION_IMAGE_FIELD] = newImageUrl;

				// Update the needs review item and add a log to the changelog.
				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_IMAGE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];
			}
		}
		else {
			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
			let siteCustomizationType = customizationType[TYPE_NAME_FIELD];

			let newImageUrl = await getCustomizationImageUrl(
				folderDict,
				headers,
				customizationDetails.Title,
				customizationDetails.MediaPath,
				customizationDetails.MimeType,
				customizationCategory,
				siteCustomizationType,
				null,
				null,
				categorySpecificDictsAndArrays);

			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationImageField;

			if (existingItem[CUSTOMIZATION_IMAGE_FIELD] != newImageUrl) {
				itemJson[CUSTOMIZATION_IMAGE_FIELD] = newImageUrl;

				// Update the needs review item and add a log to the changelog.
				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_IMAGE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];
			}
		}

		// This case is unique. We can't actually add this outright, but need to call the replaceReference function for it.
		if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) &&
			!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) &&
			!arrayCompare(originalCoreIds, coreIdArray)) { // If the contents of the arrays don't match at all.

			const CUSTOMIZATION_CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
			itemJson[CUSTOMIZATION_CORE_REFERENCE_FIELD] = coreIdArray;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_CORE_REFERENCE_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		// Gotta love multi-references. -_- We can't actually add this outright, but need to call the replaceReference function for it, too.
		if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory) &&
			!arrayCompare(originalAttachmentIds, attachmentIdArray)) {
			// The nested ifs aren't ideal, but this basically prevents us from bloating the changelog with unnecessary entries.
			// Unfortunately, this will not work in two circumstances: a helmet (or attachment-supporting item) is exclusive to the Kit, or an attachment can only apply to the parent item on this Kit.
			// Need to monitor and respond to this potential issue if necessary.
			if (!customizationDetails.IsKitItem || existingItem.isKitItemOnly) {
				const CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAttachmentReferenceField;
				itemJson[CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD] = attachmentIdArray;

				// Update the needs review item and add a log to the changelog.
				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];
			}
		}

		// If this is a Kit, we need to add arrays for its child items and attachments.
		if (CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
			const IS_KIT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsKitField;
			if (customizationType[IS_KIT_FIELD] && !arrayCompare(originalKitItemIds, kitItemIdArray)) {
				const CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitItemReferenceField;

				itemJson[CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD] = kitItemIdArray;

				// Update the needs review item and add a log to the changelog.
				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];

				if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory) && !arrayCompare(originalKitAttachmentIds, kitAttachmentIdArray)) {
					const CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD =
						CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitAttachmentReferenceField;

					itemJson[CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD] = kitAttachmentIdArray;

					// Update the needs review item and add a log to the changelog.
					changed = true;
					let returnedJsons = markItemAsChanged(itemJson, existingItem, CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD, customizationCategory);
					itemJson = returnedJsons[0];
					existingItem = returnedJsons[1];
				}
			}
		}

		// If this is an Emblem, we need to check the Emblem Palettes
		if (CustomizationConstants.HAS_EMBLEM_PALETTES_ARRAY.includes(customizationCategory)) {
			const HAS_PALETTES_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasPalettesField;
			if (customizationType[HAS_PALETTES_FIELD] && !arrayCompare(originalEmblemPaletteIds, customizationDetails.EmblemPalettes)) {
				const EMBLEM_PALETTE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].EmblemPaletteReferenceField;
				itemJson[EMBLEM_PALETTE_REFERENCE_FIELD] = customizationDetails.EmblemPalettes;

				// Update the needs review item and add a log to the changelog.
				changed = true;
				let returnedJsons = markItemAsChanged(itemJson, existingItem, EMBLEM_PALETTE_REFERENCE_FIELD, customizationCategory);
				itemJson = returnedJsons[0];
				existingItem = returnedJsons[1];
			}
		}

		const QUALITY_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationQualityReferenceField;
		if (qualityId != existingItem[QUALITY_REFERENCE_FIELD]) {
			itemJson[QUALITY_REFERENCE_FIELD] = qualityId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, QUALITY_REFERENCE_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const LORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationLoreField;
		if (customizationDetails.Description.normalize() !== existingItem[LORE_FIELD].normalize()) {
			itemJson[LORE_FIELD] = customizationDetails.Description;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, LORE_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const MANUFACTURER_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationManufacturerReferenceField;
		if (manufacturerId != existingItem[MANUFACTURER_REFERENCE_FIELD]) {
			itemJson[MANUFACTURER_REFERENCE_FIELD] = manufacturerId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, MANUFACTURER_REFERENCE_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const RELEASE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationReleaseReferenceField;
		if (releaseId != existingItem[RELEASE_REFERENCE_FIELD]) {
			itemJson[RELEASE_REFERENCE_FIELD] = releaseId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, RELEASE_REFERENCE_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const HIDDEN_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationHiddenField;
		if (!customizationDetails.HideUntilOwned && existingItem[HIDDEN_FIELD]) {
			itemJson[HIDDEN_FIELD] = customizationDetails.HideUntilOwned; // This addition will allow the automation to show items as they become visible.

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, HIDDEN_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const IS_KIT_ITEM_ONLY_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationIsKitItemOnlyField;
		if (!customizationDetails.IsKitItem && existingItem[IS_KIT_ITEM_ONLY_FIELD]) {
			itemJson[IS_KIT_ITEM_ONLY_FIELD] = customizationDetails.IsKitItem; // This addition will allow the automation to convert an item from Kit Only to general use.

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, IS_KIT_ITEM_ONLY_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CUSTOMIZATION_TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
		let newAltText = customizationDetails.Title + " " + customizationType[CUSTOMIZATION_TYPE_NAME_FIELD];

		const ALT_TEXT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAltTextField;
		if (newAltText != existingItem[ALT_TEXT_FIELD]) {
			itemJson[ALT_TEXT_FIELD] = newAltText;

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, ALT_TEXT_FIELD, customizationCategory);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		if (!changed) { // If we didn't make any changes to the item, we can just skip it by returning 1.
			return 1;
		}
		else {
			const API_LAST_UPDATED_DATETIME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationApiLastUpdatedDatetimeField;
			itemJson[API_LAST_UPDATED_DATETIME_FIELD] = new Date();
		}
		
		//console.log(existingItem);
		//console.log(itemJson);
		itemJsonToInsert = itemJson;
	}
	else { // The item wasn't found, so we need to create a new item.
		//console.log("Adding new item");

		let itemJson = {};

		const CUSTOMIZATION_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationWaypointIdField;
		itemJson[CUSTOMIZATION_WAYPOINT_ID_FIELD] = customizationDetails.WaypointId;

		const CUSTOMIZATION_ITEM_E_TAG_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationItemETagField;
		itemJson[CUSTOMIZATION_ITEM_E_TAG_FIELD] = eTagDict[customizationDetails.WaypointId];

		const API_LAST_UPDATED_DATETIME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationApiLastUpdatedDatetimeField;
		itemJson[API_LAST_UPDATED_DATETIME_FIELD] = new Date();

		// Add the item name and customization type.
		const CUSTOMIZATION_NAME_FIELD = CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField;
		itemJson[CUSTOMIZATION_NAME_FIELD] = customizationDetails.Title;
		if (!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {
			const CUSTOMIZATION_SOCKET_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
			itemJson[CUSTOMIZATION_SOCKET_REFERENCE_FIELD] = customizationType._id;
		}

		const IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsCrossCoreField;
		if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) && !customizationType[IS_CROSS_CORE_FIELD]) { // If we have a non-cross-core customization type.
			// Note that this means we'll be storing cross-core items in random core-specific folders for now. TODO: Find a better option if this becomes problematic in the future.
			let parentSiteType = null; // This only applies to attachments that have parent items (e.g. for Helmet Attachments, this will be "Helmet")
			if ("ParentType" in customizationDetails && CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
				const PARENT_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketParentTypeReferenceField;
				const PARENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].ParentKey;
				const PARENT_SOCKET_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[PARENT_KEY].SocketNameField;

				parentSiteType = customizationType[PARENT_TYPE_REFERENCE_FIELD][PARENT_SOCKET_NAME_FIELD];
			}
			else if (CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
				// We need to know the parent item but it wasn't supplied. Time to die.
				console.error("Parent item not supplied for attachment " + customizationDetails.Title);
				return -1;
			}

			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
			let siteCustomizationType = customizationType[TYPE_NAME_FIELD];

			let newImageUrl = await getCustomizationImageUrl(
				folderDict,
				headers,
				customizationDetails.Title,
				customizationDetails.MediaPath,
				customizationDetails.MimeType,
				customizationCategory,
				siteCustomizationType,
				customizationDetails.Cores[0].name,
				parentSiteType,
				categorySpecificDictsAndArrays);

			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationImageField;
			itemJson[CUSTOMIZATION_IMAGE_FIELD] = newImageUrl;
		}
		else {
			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
			let siteCustomizationType = customizationType[TYPE_NAME_FIELD];

			let newImageUrl = await getCustomizationImageUrl(
				folderDict,
				headers,
				customizationDetails.Title,
				customizationDetails.MediaPath,
				customizationDetails.MimeType,
				customizationCategory,
				siteCustomizationType,
				null,
				null,
				categorySpecificDictsAndArrays);

			const CUSTOMIZATION_IMAGE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationImageField;
			itemJson[CUSTOMIZATION_IMAGE_FIELD] = newImageUrl;
		}

		// Remember to add this field using the replaceReference function.
		if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) &&
			!(CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory))) {

			const CUSTOMIZATION_CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
			itemJson[CUSTOMIZATION_CORE_REFERENCE_FIELD] = coreIdArray;
		}

		// Remember to add this field using the replaceReference function.
		if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
			const CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAttachmentReferenceField;
			itemJson[CUSTOMIZATION_ATTACHMENT_REFERENCE_FIELD] = attachmentIdArray;
		}

		// This will need to be added with the replaceReference function. If we're working with a Kit, get the child items (and if applicable, child attachments).
		if (CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
			const IS_KIT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsKitField;
			if (customizationType[IS_KIT_FIELD]) {
				const CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitItemReferenceField;

				itemJson[CUSTOMIZATION_KIT_ITEM_REFERENCE_FIELD] = kitItemIdArray;

				if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
					const CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD =
						CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitAttachmentReferenceField;

					itemJson[CUSTOMIZATION_KIT_ATTACHMENT_REFERENCE_FIELD] = kitAttachmentIdArray;
				}
			}
		}

		if (CustomizationConstants.HAS_EMBLEM_PALETTES_ARRAY.includes(customizationCategory)) {
			const HAS_PALETTES_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasPalettesField;
			if (customizationType[HAS_PALETTES_FIELD]) {
				const EMBLEM_PALETTE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].EmblemPaletteReferenceField;
				itemJson[EMBLEM_PALETTE_REFERENCE_FIELD] = customizationDetails.EmblemPalettes;
			}
		}

		const CUSTOMIZATION_QUALITY_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationQualityReferenceField;
		itemJson[CUSTOMIZATION_QUALITY_REFERENCE_FIELD] = qualityId;

		const CUSTOMIZATION_LORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationLoreField;
		itemJson[CUSTOMIZATION_LORE_FIELD] = customizationDetails.Description;

		const CUSTOMIZATION_MANUFACTURER_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationManufacturerReferenceField;
		itemJson[CUSTOMIZATION_MANUFACTURER_REFERENCE_FIELD] = manufacturerId;

		const CUSTOMIZATION_RELEASE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationReleaseReferenceField;
		itemJson[CUSTOMIZATION_RELEASE_REFERENCE_FIELD] = releaseId;

		const CUSTOMIZATION_SOURCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceField;
		itemJson[CUSTOMIZATION_SOURCE_FIELD] = "(Pending)";

		const CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;
		itemJson[CUSTOMIZATION_CURRENTLY_AVAILABLE_FIELD] = false; // This is a default value that will almost always be correct.

		const HIDDEN_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationHiddenField;
		itemJson[HIDDEN_FIELD] = customizationDetails.HideUntilOwned;

		const IS_KIT_ITEM_ONLY_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationIsKitItemOnlyField;
		itemJson[IS_KIT_ITEM_ONLY_FIELD] = customizationDetails.IsKitItem; // If we're adding a Kit item, we're going to treat it as Kit exclusive until the general version is reached.

		const SOURCE_TYPE_REFERENCE = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;
		itemJson[SOURCE_TYPE_REFERENCE] =
			((customizationDetails.IsKitItem) ? [sourceTypeDict[CustomizationConstants.SOURCE_TYPE_KIT_ITEM]] : [sourceTypeDict[CustomizationConstants.SOURCE_TYPE_PENDING]]);

		const NEEDS_REVIEW_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNeedsReviewField;
		itemJson[NEEDS_REVIEW_FIELD] = true;

		const CUSTOMIZATION_TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
		const ALT_TEXT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAltTextField;
		itemJson[ALT_TEXT_FIELD] = customizationDetails.Title + " " + customizationType[CUSTOMIZATION_TYPE_NAME_FIELD];

		var datetime = getCurrentDateTimeString();
		const CHANGE_LOG_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationChangeLogField;
		itemJson[CHANGE_LOG_FIELD] = [(datetime + ": Added item to DB.")];

		itemJsonToInsert = itemJson;
	}

	return itemJsonToInsert;
}

// This function will use the following logic:
// If item exists in DB (check Waypoint ID)
// 	   Compare each existing value with the new value. If not matching:
// 	       Replace existing with new (except for source, sourcetype, currentlyAvailable, hidden (if false)) 
//         Log all changes to changeLog entry for item.
//         Mark item as "Needs Review".
// Otherwise
//     Add item to DB.
//	   Log item as added.
//     Mark item as "Needs Review".
// It's more efficient to add items all at once, so this will just assemble the JSON needed to add an item to the DB. If it returns -1, an error occurred.
// customizationCategory: One of the following: "Armor", "Weapon", "Vehicle"
// customizationDetails: A dictionary object containing each of the properties of the item to be added:
/*
	{
		"Title": [name],
		"Type": [waypointType],
		"MediaPath": [waypointImagePath],
		"MimeType": [waypointMimeType],
		"Quality": [qualityName],
		"Description": [lore],
		"ManufacturerId": [manufacturerIndex], // The index of the manufacturer when all are listed in alphabetical order.
		"Season": [release],
		"RewardTrack": [waypointPassPath], // This may be null or the empty string. If it exists, it can be used to generate the source.
		"CustomAvailability": [source], // This is almost always null or the empty string.
		"HideUntilOwned": [hidden], // This will usually be honored, except in the case of promo items.
		"WaypointId": [waypointId] // This will identify the core based on its Waypoint ID.
		// Might be worth adding the ability to include Sockets in the future, but not really necessary ATM.
	}
*/
async function getCoreItemToSave(folderDict, headers, customizationCategory, customizationDetails, generalDictsAndArrays) {
	// If we don't have variables defined for the customization category, we need to get out now. Everything will break otherwise.
	if(!(customizationCategory in CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS)) {
		console.error("Invalid customizationCategory value for getCoreItemToSave: " + customizationCategory);
		return -1;
	}
	else if (generalDictsAndArrays.length != 5) { // We expect 5 dicts/arrays in this construct.
		console.error("Unexpected length for generalDictsAndArrays. Expected 5, got ", generalDictsAndArrays.length);
	}

	// Extract the dicts and array from generalDictsAndArrays.
	// [0]: qualityDict
	// [1]: releaseDict
	// [2]: manufacturerArray (index aligns with Waypoint ID num)
	// [3]: sourceTypeDict (not needed for core ingestion)
	// [4]: eTagDict
	let qualityDict = generalDictsAndArrays[0];
	let releaseDict = generalDictsAndArrays[1];
	let manufacturerArray = generalDictsAndArrays[2];
	// let sourceTypeDict = generalDictsAndArray[3]; // This one is unnecessary for core ingestion.
	let eTagDict = generalDictsAndArrays[4];

	// This is used for pointing out the Cores folder when adding images.
	let siteCustomizationType = CustomizationConstants.ITEM_TYPES.core; 
	
	// We need to check a few things before we can see if the item already has an entry.
	// For one, we can guarantee uniqueness by checking for items with matching name.
	// It's already time to select the item (wow, so easy!)
	let existingItem = {};

	const CORE_DB = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreDb;
	const CORE_WAYPOINT_ID_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreWaypointIdField;

	let retry = true;
	let retryCount = 0;
	const maxRetries = 10;

	while (retry && retryCount < maxRetries) {
		await wixData.query(CORE_DB)
			.eq(CORE_WAYPOINT_ID_FIELD, customizationDetails.WaypointId)
			.find()
			.then((results) => {
				retry = false;

				if (results.items.length == 1) { // This is the expected case for now. If cross-core occurs in the future, this will affect some things.
					existingItem = results.items[0]; // We just need to store it for the moment.
				}
				else if (results.items.length > 1) { // This shouldn't happen since we would have multiple cores with the same name...
					throw "Too many cores returned for name filter " + customizationDetails.Title;
				}
				else {
					existingItem = null;
				}
			})
			.catch ((error) => {
				console.error(error + " occurred while fetching core matching ID " + customizationDetails.WaypointId + ". Try " + (++retryCount) + " of " + maxRetries);
			});
	}

	if (retry) {
		// If the query still didn't succeed after all that, we exit in sadness.
		return -1;
	}

	// Check to see if the ETag has changed, suggesting the item itself has changed.
	if (existingItem 
		&& existingItem.itemETag 
		&& existingItem.itemETag != "" 
		&& existingItem.itemETag == eTagDict[customizationDetails.WaypointId]) {
		
		// The ETag is identical. No need to process further.
		return 1;
	}
	
	// The next step is to compare the current item with things in our arguments, but we need to translate some name into IDs, namely for quality, manufacturer, and release.
	// Let's start with quality.
	let qualityId = "";
	qualityId = qualityDict[customizationDetails.Quality];

	// Next, we do the release.
	let releaseId = "";
	releaseId = releaseDict[customizationDetails.Season];

	// Finally, we do the manufacturer.
	let manufacturerId = "";
	manufacturerId = manufacturerArray[customizationDetails.ManufacturerId];


	let itemJsonToInsert = {};

	// If we found an existing item, we need to compare some of the existing fields with the new ones to see if it should be added.
	// We know the itemName matches, as does the customization Type. There may be more armor cores to add, so we'll check that.
	//console.log(existingItem);
	if (existingItem) {
		//console.log ("Updating existing item.");

		let itemJson = structuredClone(existingItem); // Let's go! A real clone function! We need to copy this to avoid modifying the original Change Log.
		let changed = false; // If this flag becomes true, we made a change. Otherwise, we return 1 since we don't need to add anything.

		const CORE_WAYPOINT_ID_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreWaypointIdField;
		if (!itemJson[CORE_WAYPOINT_ID_FIELD] || itemJson[CORE_WAYPOINT_ID_FIELD] == "") {
			itemJson[CORE_WAYPOINT_ID_FIELD] = customizationDetails.WaypointId; // We're saving the Waypoint ID here.
			changed = true;
		}

		const CORE_E_TAG_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreItemETagField;
		if (customizationDetails.WaypointId in eTagDict && itemJson[CORE_E_TAG_FIELD] != eTagDict[customizationDetails.WaypointId]) {
			// If the Waypoint ID exists in the ETag Dictionary and doesn't have a matching record to our DB entry.
			itemJson[CORE_E_TAG_FIELD] = eTagDict[customizationDetails.WaypointId];
			changed = true;
		}

		const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;
		if (itemJson[CORE_NAME_FIELD] != customizationDetails.Title) {
			itemJson[CORE_NAME_FIELD] = customizationDetails.Title;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_NAME_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}
		
		let newImageUrl = await getCustomizationImageUrl(
			folderDict,
			headers,
			customizationDetails.Title,
			customizationDetails.MediaPath,
			customizationDetails.MimeType,
			customizationCategory,
			siteCustomizationType);

		const CORE_IMAGE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreImageField;
		if (existingItem[CORE_IMAGE_FIELD] != newImageUrl) {
			itemJson[CORE_IMAGE_FIELD] = newImageUrl;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_IMAGE_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CORE_QUALITY_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreQualityReferenceField;
		if (qualityId != existingItem[CORE_QUALITY_REFERENCE_FIELD]) {
			itemJson[CORE_QUALITY_REFERENCE_FIELD] = qualityId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_QUALITY_REFERENCE_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CORE_LORE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreLoreField;
		if (customizationDetails.Description.normalize() !== existingItem[CORE_LORE_FIELD].normalize()) {
			itemJson[CORE_LORE_FIELD] = customizationDetails.Description;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_LORE_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CORE_MANUFACTURER_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreManufacturerReferenceField;
		if (manufacturerId != existingItem[CORE_MANUFACTURER_REFERENCE_FIELD]) {
			itemJson[CORE_MANUFACTURER_REFERENCE_FIELD] = manufacturerId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_MANUFACTURER_REFERENCE_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CORE_RELEASE_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreReleaseReferenceField;
		if (releaseId != existingItem[CORE_RELEASE_REFERENCE_FIELD]) {
			itemJson[CORE_RELEASE_REFERENCE_FIELD] = releaseId;

			// Update the needs review item and add a log to the changelog.
			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_RELEASE_REFERENCE_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		const CORE_HIDDEN_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreHiddenField;
		if (!customizationDetails.HideUntilOwned && existingItem[CORE_HIDDEN_FIELD]) {
			itemJson[CORE_HIDDEN_FIELD] = customizationDetails.HideUntilOwned; // This addition will allow the automation to show items as they become visible.

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_HIDDEN_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		let newAltText = customizationDetails.Title + " " + CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreType;
		const CORE_ALT_TEXT_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreAltTextField;
		if (newAltText != existingItem[CORE_ALT_TEXT_FIELD]) {
			itemJson[CORE_ALT_TEXT_FIELD] = newAltText;

			changed = true;
			let returnedJsons = markItemAsChanged(itemJson, existingItem, CORE_ALT_TEXT_FIELD, customizationCategory, true);
			itemJson = returnedJsons[0];
			existingItem = returnedJsons[1];
		}

		if (!changed) { // If we didn't make any changes to the item, we can just skip it by returning 1.
			//console.log("No changes needed for ", customizationDetails.Title, " Core. Skipping...");
			return 1;
		}
		else {
			const CORE_API_LAST_UPDATED_DATETIME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreApiLastUpdatedDatetimeField;
			itemJson[CORE_API_LAST_UPDATED_DATETIME_FIELD] = new Date();
		}

		itemJsonToInsert = itemJson;

	}
	else { // The item wasn't found, so we need to create a new item.
		//console.log("Adding new item");
		let itemJson = {};

		const CORE_WAYPOINT_ID_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreWaypointIdField;
		itemJson[CORE_WAYPOINT_ID_FIELD] = customizationDetails.WaypointId; // We're saving the Waypoint ID here.

		const CORE_E_TAG_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreItemETagField;
		itemJson[CORE_E_TAG_FIELD] = eTagDict[customizationDetails.WaypointId];

		const CORE_API_LAST_UPDATED_DATETIME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreApiLastUpdatedDatetimeField;
		itemJson[CORE_API_LAST_UPDATED_DATETIME_FIELD] = new Date();

		// Add the core name.
		const CORE_NAME_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;
		itemJson[CORE_NAME_FIELD] = customizationDetails.Title;

		const CORE_IMAGE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreImageField;
		itemJson[CORE_IMAGE_FIELD] = await getCustomizationImageUrl(
			folderDict,
			headers,
			customizationDetails.Title,
			customizationDetails.MediaPath,
			customizationDetails.MimeType,
			customizationCategory,
			siteCustomizationType);

		const CORE_QUALITY_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreQualityReferenceField;
		itemJson[CORE_QUALITY_REFERENCE_FIELD] = qualityId;

		const CORE_LORE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreLoreField;
		itemJson[CORE_LORE_FIELD] = customizationDetails.Description;

		const CORE_MANUFACTURER_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreManufacturerReferenceField;
		itemJson[CORE_MANUFACTURER_REFERENCE_FIELD] = manufacturerId;

		const CORE_RELEASE_REFERENCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreReleaseReferenceField;
		itemJson[CORE_RELEASE_REFERENCE_FIELD] = releaseId;

		const CORE_SOURCE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreSourceField;
		itemJson[CORE_SOURCE_FIELD] = "(Pending)";

		const CORE_CURRENTLY_AVAILABLE_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreCurrentlyAvailableField;
		itemJson[CORE_CURRENTLY_AVAILABLE_FIELD] = false; // This is false by default but may actually need to be manually or automatically updated to true.

		const CORE_HIDDEN_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreHiddenField;
		itemJson[CORE_HIDDEN_FIELD] = customizationDetails.HideUntilOwned;

		const CORE_NEEDS_REVIEW_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNeedsReviewField;
		itemJson[CORE_NEEDS_REVIEW_FIELD] = true;

		const CORE_ALT_TEXT_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreAltTextField;
		itemJson[CORE_ALT_TEXT_FIELD] = customizationDetails.Title + " " + CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreType;

		const CORE_CHANGE_LOG_FIELD = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreChangeLogField;
		var datetime = getCurrentDateTimeString();
		itemJson[CORE_CHANGE_LOG_FIELD] = [(datetime + ": Added item to DB.")];

		itemJsonToInsert = itemJson;
	}

	return itemJsonToInsert;
}

// This function will convert from waypointJson to the customizationDetails JSON format.
// customizationCategory: One of the accepted category keys.
// waypointJson: The JSON file returned directly from Waypoint.
// Within "options":
// categorySpecificDictsAndArrays: The dictionaries and arrays specific to the category of interest. Not available for cores.
// itemType: Should be set to ITEM_TYPES.core if function is used for core.
// waypointThemePathToCoreDict: A dictionary that uses the Waypoint Paths in ParentPaths (which are themes) as keys and returns the names of the associated items.
// attachmentArray: An array of attachment names. Needs to be determined externally due to the information included in the JSON.
// parentWaypointType: The parent type of the item, only used for attachments.
// isKitItem: Only true if the item belongs to a Kit.
// kitChildItemArray: Array of Kit Items, for addition to the Kit item itself.
// kitChildAttachmentArray: Array of Kit Attachments, for addition to the Kit item itself.
export function getCustomizationDetailsFromWaypointJson(customizationCategory, waypointJson, options) {
	// options can contain (defaults shown)
	/* categorySpecificDictsAndArrays = null,	// Required for all non-core item additions.
	 * itemType = null,							// Only required for core items.
	 * waypointThemePathToCoreDict = null,		// Required for non-cross-core items with cores.
	 * attachmentArray = null,					// Required for items with attachments.
	 * parentWaypointType = null,				// Required for attachments.
	 * isKitItem = false,						// Required for Kit Items.
	 * kitChildItemArray = [],					// Required for Kits.
	 * kitChildAttachmentArray = []				// Required for Kits with attachments.
	 */

	// We want to create this JSON structure:
	/*
		{
			"Title": [itemName],
			"Type": [waypointType],
			"MediaPath": [waypointImagePath],
			"MimeType": [waypointMimeType],
			"Cores": [coreNameArray], // Only available on core-based customizations. Is an array to support cross-core pieces. Will only include "Any" if piece is fully cross-core.
			"Quality": [qualityName],
			"Description": [lore],
			"ManufacturerId": [manufacturerIndex], // The index of the manufacturer when all are listed in alphabetical order.
			"Season": [release],
			"RewardTrack": [waypointPassPath], // This may be null or the empty string. If it exists, it can be used to generate the source.
			"CustomAvailability": [source], // This is almost always null or the empty string.
			"HideUntilOwned": [hidden], // This will usually be honored, except in the case of promo items.
			"Attachments": [attachmentArray], // Contains an array of attachment names that apply to this item. Parent item needs to be added after the attachments are added to the DB.
			"ParentType": [parentWaypointType], // This should only really be used for attachment items.
			"WaypointId": [waypointId],
			"IsKitItem": [isKitItem], // Only true if the item was added as part of a Kit.
			"ChildItems": [kitChildItemArray],
			"ChildAttachments": [kitChildAttachmentArray]
		}
	*/

	let itemJson = {};
	let waypointCommonDataJson = waypointJson.CommonData;
	itemJson.Title = waypointCommonDataJson.Title;
	itemJson.Type = waypointCommonDataJson.Type;

	itemJson.MediaPath = waypointCommonDataJson.DisplayPath.Media.MediaUrl.Path;
	itemJson.MimeType = waypointCommonDataJson.DisplayPath.MimeType;

	// Extract the category specific Dicts and Arrays, if they exist.

	if (!(itemType in options && options.itemType == CustomizationConstants.ITEM_TYPES.core) &&
		CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory)) {

		if (!("categorySpecificDictsAndArrays" in options)) {
			console.error("Could not find categorySpecificDictsAndArrays in options:", options, "Exiting...");
			throw "getCustomizationDetailsFromWaypointJson: categorySpecificDictsAndArrays necessary, but missing";
		}

		let categorySpecificDictsAndArrays = options.categorySpecificDictsAndArrays;
		if (categorySpecificDictsAndArrays.length != 2) {
			console.error("Expected 2 items in categorySpecificDictsAndArrays, only got " + categorySpecificDictsAndArrays.length +
				". Trying to run getCustomizationDetailsFromWaypointJson() with options", options);
		}

		// Extract the dict and array from categorySpecificDictsAndArrays.
		// [0]: customizationTypeArray
		// [1]: coreIdDict (Not needed for this function)
		customizationTypeArray = categorySpecificDictsAndArrays[0];
		//coreIdDict = categorySpecificDictsAndArrays[1];

		// Determine if our customization type is cross core.
		const TYPE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointIdField;
		const TYPE_IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsCrossCoreField;
		let itemIsCrossCore = true; // Default this to true, make false when necessary.
		customizationTypeArray.some((type) => {
			if (type[TYPE_WAYPOINT_ID_FIELD] == itemJson.Type) {
				itemIsCrossCore = type[TYPE_IS_CROSS_CORE_FIELD];
				return true;
			}
		});

		// If it isn't cross-core, we need to get the list of cores to which the item applies.
		if (!itemIsCrossCore) {
			// Ensure the waypointThemePathToCoreDict was passed in.
			if (!("waypointThemePathToCoreDict" in options)) {
				console.error("Could not find waypointThemePathToCoreDict in options:", options, "Exiting...");
				throw "getCustomizationDetailsFromWaypointJson: waypointThemePathToCoreDict necessary, but missing";
			}

			// We don't need to add the Cores field when working with a Core item or a non-core customization category.
			// If the item isn't cross-core, we can't use the "Any" shortcut.
			itemJson.Cores = [];
			if (waypointCommonDataJson.ParentPaths.length > 0) { // First check the ParentPaths array.
				waypointCommonDataJson.ParentPaths.forEach((themePathItem) => {
					if (themePathItem.Path in options.waypointThemePathToCoreDict &&
						!itemJson.Cores.includes(options.waypointThemePathToCoreDict[themePathItem.Path])) {

						itemJson.Cores.push(options.waypointThemePathToCoreDict[themePathItem.Path]);
					}
				});
			}
			else { // If that wasn't populated, check the ParentTheme field.
				if (waypointCommonDataJson.ParentTheme in options.waypointThemePathToCoreDict &&
					!itemJson.Cores.includes(options.waypointThemePathToCoreDict[waypointCommonDataJson.ParentTheme])) {

					itemJson.Cores.push(options.waypointThemePathToCoreDict[waypointCommonDataJson.ParentTheme]);
				}
				else {
					throw "Item " + itemJson.Title + " does not have a valid parent core. Skipping for now...";
				}
			}
		}
		else {
			itemJson.Cores = ["Any"]; // We've cleverly specified "Any" as the Waypoint ID for the Any option.
		}
		//console.log("Item: " + itemJson.Title, itemJson.Cores, waypointCommonDataJson.ParentPaths, waypointThemePathToCoreDict);
	}

	itemJson.Quality = waypointCommonDataJson.Quality;
	itemJson.Description = waypointCommonDataJson.Description;
	itemJson.ManufacturerId = waypointCommonDataJson.ManufacturerId;
	itemJson.Season = waypointCommonDataJson.Season;
	itemJson.RewardTrack = waypointCommonDataJson.RewardTrack;
	itemJson.CustomAvailability = waypointCommonDataJson.CustomAvailability;
	itemJson.HideUntilOwned = waypointCommonDataJson.HideUntilOwned;

	if ("attachmentArray" in options) {
		itemJson.Attachments = options.attachmentArray;
	}
	else {
		itemJson.Attachments = null;
	}

	if ("parentWaypointType" in options) {
		itemJson.ParentType = options.parentWaypointType;
	}
	else {
		itemJson.ParentType = null;
	}

	itemJson.WaypointId = waypointCommonDataJson.Id;

	if ("isKitItem" in options) {
		itemJson.IsKitItem = options.isKitItem; // If this is true, this item was found as a child of a Kit.
	}
	else {
		itemJson.IsKitItem = false;
	}

	if ("kitChildItemArray" in options) {
		itemJson.ChildItems = options.kitChildItemArray;
	}
	else {
		itemJson.ChildItems = [];
	}

	if ("kitChildAttachmentArray" in options) {
		itemJson.ChildAttachments = options.kitChildAttachmentArray;
	}
	else {
		itemJson.ChildAttachments = [];
	}

	return itemJson;
}

// Keys are Configuration IDs and values are true/false. 
// A true value means the ID is being processed currently, and a false value or nonexistent key means the ID is free to process.
let lockedEmblemPaletteConfigurationIdsDict = {}; 

// Keys are Configuration IDs and values are corresponding DB IDs.
let processedEmblemPaletteConfigurationIdsDict = {}; 

// This will let us sleep while waiting for a Configuration ID to be unlocked.
function sleep(ms) {
  	return new Promise(resolve => setTimeout(resolve, ms));
}

// This function accepts the "AvailableConfigurations" array from an emblem item, adds the Emblem Palettes from the array to the DB if necessary, and returns an array of DbIds.
async function addEmblemPalettesToDb(emblemPalettePathArray, folderDict, headers) {
	let emblemPaletteDbIdArray = [];

	for (let i = 0; i < emblemPalettePathArray.length; ++i) {
		let emblemPalettePathObject = emblemPalettePathArray[i];

		if (emblemPalettePathObject.ConfigurationId in processedEmblemPaletteConfigurationIdsDict) { // We've processed this configuration ID before. Let's grab the DB ID and go.
			if (!emblemPaletteDbIdArray.includes(processedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId])) {
				emblemPaletteDbIdArray.push(processedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId]);
			}
			continue;
		}

		// We're doing a simple active wait to ensure a configuration ID is only processed once at a time. 
		// This isn't perfect since the below check isn't atomic, but it should be just enough (I think...)
		while (emblemPalettePathObject.ConfigurationId in lockedEmblemPaletteConfigurationIdsDict && lockedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId]) {
			let randSleepMs = Math.floor(Math.random() * 1000) + 1000; 
			// Sleeping for a random amount of time gives a much smaller likelihood of two threads reprocessing simultaneously (shouldn't really matter, but it doesn't hurt to avoid it).
			console.log("Emblem Palette Configuration ID " + emblemPalettePathObject.ConfigurationId + " is currently locked. Sleeping for " + randSleepMs + " ms.");
			await sleep(randSleepMs);
		}
		try {
			lockedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId] = true; // Lock the configuration ID.
			//console.log("Locked Configuration ID " + emblemPalettePathObject.ConfigurationId);
			let emblemPaletteDbId;

			let retry = true;
			let retryCount = 0;
			const maxRetries = 10;

			while (retry && retryCount < maxRetries) {
				emblemPaletteDbId = await wixData.query(CustomizationConstants.EMBLEM_PALETTE_DB)
					.eq(CustomizationConstants.EMBLEM_PALETTE_CONFIGURATION_ID_FIELD, emblemPalettePathObject.ConfigurationId)
					.find()
					.then((results) => {
						retry = false;

						if (results.items.length > 0) {
							if (results.items.length > 1) {
								throw "Uniqueness was assumed but not upheld for configuration ID " + emblemPalettePathObject.ConfigurationId;
							}
							else {
								// Only one item returned. Send up its DB ID.
								return results.items[0]._id;
							}
						}
						else { // No emblem palettes found. We need to add it.
							return null;
						}
					})
					.catch((error) => {
						console.error(error + " occurred while validating emblem configuration ID " + emblemPalettePathObject.ConfigurationId + "." + 
							((retry) ? ("Try " + (++retryCount) + " of " + maxRetries + "...") : ""));
						return -1;
					});
			}

			if (emblemPaletteDbId == -1) { // If the emblem palette config ID fetch failed.
				throw "Failed to confirm presence of Emblem Palette Configuration ID" + emblemPalettePathObject.ConfigurationId;
			}
			
			if (!emblemPaletteDbId) {
				// Let's add the emblem palette. We need to get all the field data now.
				let emblemPaletteWaypointJson = await getCustomizationItem(headers, emblemPalettePathObject.ConfigurationPath);

				let emblemPaletteName = emblemPaletteWaypointJson.CommonData.Title;

				// Get the image URL.
				let emblemPaletteWaypointImageUrl = emblemPaletteWaypointJson.CommonData.DisplayPath.Media.MediaUrl.Path;
				let emblemPaletteMimeType = emblemPaletteWaypointJson.CommonData.DisplayPath.MimeType;
				let emblemPaletteUrl = await getCustomizationImageUrl(
					folderDict,
					headers,
					emblemPaletteName,
					emblemPaletteWaypointImageUrl,
					emblemPaletteMimeType,
					CustomizationConstants.EMBLEM_PALETTE_KEY,
					"Emblem Palette");

				let emblemPaletteWaypointId = emblemPaletteWaypointJson.CommonData.Id;

				let emblemPaletteConfigurationId = emblemPalettePathObject.ConfigurationId;

				let emblemPaletteDbJson = {
					[CustomizationConstants.EMBLEM_PALETTE_NAME_FIELD]: emblemPaletteName,
					[CustomizationConstants.EMBLEM_PALETTE_IMAGE_FIELD]: emblemPaletteUrl,
					[CustomizationConstants.EMBLEM_PALETTE_WAYPOINT_ID_FIELD]: emblemPaletteWaypointId,
					[CustomizationConstants.EMBLEM_PALETTE_CONFIGURATION_ID_FIELD]: emblemPaletteConfigurationId
				};

				retry = true;
				retryCount = 0;

				while (retry && retryCount < maxRetries) {
					emblemPaletteDbId = await wixData.insert(CustomizationConstants.EMBLEM_PALETTE_DB, emblemPaletteDbJson)
						.then((results) => {
							retry = false;
							console.log("Inserted Emblem Palette: ", results);
							return results;
						})
						.catch((error) => {
							console.error(error + " occurred while adding emblem configuration ID " + emblemPalettePathObject.ConfigurationId + " to DB." + 
								((retry) ? ("Try " + (++retryCount) + " of " + maxRetries + "...") : ""));
							return null;
						});
				}
			}

			lockedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId] = false; // Unlock the configuration ID.
			//console.log("Unlocked Configuration ID " + emblemPalettePathObject.ConfigurationId);

			if (!emblemPaletteDbIdArray.includes(emblemPaletteDbId)) { // If we haven't already added this Emblem Palette to the array.
				emblemPaletteDbIdArray.push(emblemPaletteDbId);
			}

			processedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId] = emblemPaletteDbId
		}
		catch (error) {
			lockedEmblemPaletteConfigurationIdsDict[emblemPalettePathObject.ConfigurationId] = false; // Unlock the configuration ID if we encountered an error.
			console.error(error + " occurred while adding Emblem Palette with Configuration ID " + emblemPalettePathObject.ConfigurationId);
		}
	}

	return emblemPaletteDbIdArray;
}

// This function accepts a path and other performance variables and performs various tasks to generate an item to insert in the DB. Returns the site JSON for the item (or 1 if item should be skipped, or -1 if error occurred).
// headers: The headers used to access Waypoint endpoints.
// customizationCategory: One of the predefined category keys (e.g. KeyConstants.ARMOR_KEY)
// folderDict: The dictionary representing our media folder path, pregenerated.
// generalDictsAndArrays: The dictionaries and arrays containing prequeried information.
// categorySpecificDictsAndArrays: The dictionaries and array containing prequeried information specific to the customizationCategory.
// itemWaypointPath: The Waypoint path for the item to add.
// itemType: One of four strings: "core", "kit", "item", "attachment"
// itemPathsProcessed: Array of item paths that have already been processed.
// Within options:
// coreName: The name of the parent core, if applicable. If "" (default), then no parent core is assumed. Only needed for kits.
// waypointThemePathToCoreDict: A dictionary that takes theme Waypoint paths and converts them to core names.
// coreWaypointJsonArray: An optional array of the Core Waypoint JSONs which will be modified for cores.
// attachmentArray: An array of attachment names for a particular parent item (e.g. Helmet). Should only be nonempty for attachments and items with attachments.
// attachmentPathToNameDict: A dictionary of attachment paths to their corresponding names.
// attachmentParentWaypointType: The parent waypoint type of the attachment item.
// isKitItem: Only true if the item belongs to a Kit.
// customizationWaypointIdArray: Array of Waypoint IDs, only really needed for Kit items.
// kitChildItemArray: Array of Kit Items, for addition to the Kit item itself.
// kitChildAttachmentArray: Array of Kit Attachments, for addition to the Kit item itself.
// forceCheck: If true, the item will have all its quantities compared regardless of whether the ETag matches.
async function processItem(headers,
	customizationCategory,
	folderDict,
	generalDictsAndArrays,
	categorySpecificDictsAndArrays,
	itemWaypointPath,
	itemType,
	itemPathsProcessed,
	options) {

	/* options can contain (defaults shown here):
	 * coreWaypointId = "",					// Required for items with cores (and attachments).
	 * waypointThemePathToCoreDict = {},	// Required for core-specific items.
	 * coreWaypointJsonArray = [],			// Required for cores.
	 * attachmentArray = [],				// Required for attachments and items with attachments.
	 * attachmentPathToIdDict = {},			// Required for attachments and items with attachments.
	 * attachmentParentWaypointType = "",	// Required for attachments.
	 * isKitItem = false,					// Required for kit items.
	 * customizationWaypointIdArray = [],	// Required for kit items.
	 * kitChildItemArray = [],				// Required for kits.
	 * kitChildAttachmentArray = [],		// Required for kits.
	 * forceCheck = false					// Required for kits and items with attachments.
	 */

	// This helps us avoid processing duplicate items.
	if (itemPathsProcessed.includes(itemWaypointPath)) {
		if (itemType == CustomizationConstants.ITEM_TYPES.attachment) {
			// Ensure necessary options are provided.
			if (!("attachmentArray" in options)) {
				console.error("The attachmentArray field was not found in options: ", options);
				throw "Unable to run processItem() due to missing attachmentArray field in options.";
			}

			if (!("attachmentPathToIdDict" in options)) {
				console.error("The attachmentPathToIdDict field was not found in options: ", options);
				throw "Unable to run processItem() due to missing attachmentPathToIdDict field in options.";
			}

			if (!options.attachmentArray.includes(options.attachmentPathToIdDict[itemWaypointPath])) { // We still need to add the attachment Waypoint ID to the array if we haven't already.
				options.attachmentArray.push(options.attachmentPathToIdDict[itemWaypointPath]);
			}
		}


		if (isKitItem in options && options.isKitItem) { // If this item was processed before and is a Kit Item.
			let itemWaypointJson = await getCustomizationItem(headers, itemWaypointPath);
			if (!("customizationWaypointIdArray" in options)) {
				console.error("The customizationWaypointIdArray field was not found in options: ", options);
				throw "Unable to run processItem() due to missing customizationWaypointIdArray field in options.";
			}
			options.customizationWaypointIdArray.push(itemWaypointJson.CommonData.Id);
		}

		return 1;
	}

	itemPathsProcessed.push(itemWaypointPath);
	
	// Get the item.
	let itemWaypointJson = await getCustomizationItem(headers, itemWaypointPath);

	if (itemType == CustomizationConstants.ITEM_TYPES.kit) {
		if (coreWaypointId in options && options.coreWaypointId != "") {
			if (!("waypointThemePathToCoreDict" in options)) {
				console.error("The waypointThemePathToCoreDict field was not found in options: ", options);
				throw "Unable to run processItem() due to missing waypointThemePathToCoreDict field in options.";
			}

			itemWaypointJson.CommonData.ParentPaths.forEach((waypointCorePath) => { // This is needed to correctly add the core to the item site JSON.
				options.waypointThemePathToCoreDict[waypointCorePath.Path] = options.coreWaypointId;
			});
		}
	}
	else if (itemType == CustomizationConstants.ITEM_TYPES.attachment) {
		// Ensure necessary options are provided.
		if (!("attachmentArray" in options)) {
			console.error("The attachmentArray field was not found in options: ", options);
			throw "Unable to run processItem() due to missing attachmentArray field in options.";
		}

		if (!("attachmentPathToIdDict" in options)) {
			console.error("The attachmentPathToIdDict field was not found in options: ", options);
			throw "Unable to run processItem() due to missing attachmentPathToIdDict field in options.";
		}

		options.attachmentArray.push(itemWaypointJson.CommonData.Id); // Add the ID to the array.
		options.attachmentPathToIdDict[itemWaypointPath] = itemWaypointJson.CommonData.Id; // Add the ID to the dict as well.
	}

	if (isKitItem) {
		if (!("customizationWaypointIdArray" in options)) {
			console.error("The customizationWaypointIdArray field was not found in options: ", options);
			throw "Unable to run processItem() due to missing customizationWaypointIdArray field in options.";
		}
		options.customizationWaypointIdArray.push(itemWaypointJson.CommonData.Id);
	}

	let emblemPaletteDbIds = []; // The list of emblem palette DB IDs to add to our item.

	if (CustomizationConstants.HAS_EMBLEM_PALETTES_ARRAY.includes(customizationCategory) && itemType != CustomizationConstants.ITEM_TYPES.core) {
		if (categorySpecificDictsAndArrays.length != 2) { // Ensure we can get the type array.
			console.error("categorySpecificDictsAndArrays does not have expected length of 2 in processItem().");
		}

		// We only need the customization type array.
		let customizationTypeArray = categorySpecificDictsAndArrays[0];

		const TYPE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointIdField;
		const TYPE_HAS_PALETTES_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketHasPalettesField;

		// Find the matching type and check to see if it has palettes.
		let itemHasPalettes = false;
		customizationTypeArray.some((type) => {
			if (type[TYPE_WAYPOINT_ID_FIELD] == itemWaypointJson.CommonData.Type) {
				itemHasPalettes = type[TYPE_HAS_PALETTES_FIELD];
				return true;
			}
		});

		if (itemHasPalettes) { // If the item has Emblem Palettes.
			emblemPaletteDbIds = await addEmblemPalettesToDb(itemWaypointJson.AvailableConfigurations, folderDict, headers);
		}
	}

	// Get the details for the core to pass into our site JSON generation function.
	let itemDetails;
	
	itemDetails = getCustomizationDetailsFromWaypointJson(
		customizationCategory,
		itemWaypointJson,
		{
			"categorySpecificDictsAndArrays": categorySpecificDictsAndArrays,
			"itemType": itemType,
			"waypointThemePathToCoreDict": ("waypointThemePathToCoreDict" in options) ? options.waypointThemePathToCoreDict : {},
			"attachmentArray": ("attachmentArray" in options) ? options.attachmentArray : [],
			"parentWaypointType": ("attachmentParentWaypointType" in options) ? options.attachmentParentWaypointType : "",
			"isKitItem": ("isKitItem" in options) ? options.isKitItem : false,
			"kitChildItemArray": ("kitChildItemArray" in options) ? options.kitChildItemArray : [],
			"kitChildAttachmentArray": ("kitChildAttachmentArray" in options) ? options.kitChildAttachmentArray : []
		}
	);

	// Add the Emblem Palettes to the itemDetails JSON.
	itemDetails.EmblemPalettes = emblemPaletteDbIds; 

	let itemSiteJson;
	
	if (itemType == ITEM_TYPES.core) {
		// If we're working with a core, add the Waypoint JSON to the array, get the site JSON, and add the themes and core Waypoint ID to the dictionary.
		if (!("coreWaypointJsonArray" in options)) {
			console.error("The coreWaypointJsonArray field was not found in options: ", options);
			throw "Unable to run processItem() due to missing coreWaypointJsonArray field in options.";
		}

		if (!("waypointThemePathToCoreDict" in options)) {
			console.error("The waypointThemePathToCoreDict field was not found in options: ", options);
			throw "Unable to run processItem() due to missing waypointThemePathToCoreDict field in options.";
		}

		options.coreWaypointJsonArray.push(itemWaypointJson);

		itemSiteJson = await getCoreItemToSave(
			folderDict,
			headers,
			customizationCategory,
			itemDetails,
			generalDictsAndArrays
		);
	
		itemWaypointJson.Themes.OptionPaths.forEach((waypointThemePath) => {
			options.waypointThemePathToCoreDict[waypointThemePath] = itemWaypointJson.CommonData.Id;
		});
	}
	else { // Anything other than a core uses the same function to get a DB JSON.
		itemSiteJson = await getCustomizationItemToSave(
			folderDict,
			headers,
			customizationCategory,
			itemDetails,
			generalDictsAndArrays,
			categorySpecificDictsAndArrays,
			("forceCheck" in options) ? options.forceCheck : false
		);
	}

	return itemSiteJson;
}

// This function accepts an array of paths and other performance variables and places the site JSONs in the customizationItemDbArray.
// headers: The headers used to access Waypoint endpoints.
// customizationCategory: One of the predefined category keys (e.g. KeyConstants.ARMOR_KEY)
// folderDict: The dictionary representing our media folder path, pregenerated.
// generalDictsAndArrays: The dictionaries and arrays containing prequeried information.
// categorySpecificDictsAndArrays: The dictionaries and array containing prequeried information specific to the customizationCategory.
// customizationItemDbArray: The output array of site JSONs for each item.
// customizationItemPathsProcessed: Array of item paths that have already been processed.
// customizationItemPathArray: The array of item paths to process.
// Within options:
// waypointThemePathToCoreDict: A dictionary that takes theme Waypoint paths and converts them to core names.
// isKitItem: Only true if the item belongs to a Kit.
// customizationWaypointIdArray: Array of Waypoint IDs, only really needed for Kit items.
async function generateJsonsFromItemList(
	headers,
	customizationCategory,
	folderDict,
	generalDictsAndArrays,
	categorySpecificDictsAndArrays,
	customizationItemDbArray,
	customizationItemPathsProcessed,
	customizationItemPathArray,
	options) {

	/* options can include (with defaults):
	 * waypointThemePathToCoreDict = {},	// Required for non-cross-core items.
	 * isKitItem = false,					// Required for kit items.
	 * customizationWaypointIdArray = []	// Required for kit items and kits.
	 */
	
	for (let k = 0; k < customizationItemPathArray.length; ++k) {
		try {
			let itemPath = customizationItemPathArray[k];
			let itemDbJson = await processItem(
				headers,
				customizationCategory,
				folderDict,
				generalDictsAndArrays,
				categorySpecificDictsAndArrays,
				itemPath,
				ITEM_TYPES.item,
				customizationItemPathsProcessed,
				{
					"waypointThemePathToCoreDict": ("waypointThemePathToCoreDict" in options) ? options.waypointThemePathToCoreDict : {},
					"isKitItem": ("isKitItem" in options) ? options.isKitItem : false,
					"customizationWaypointIdArray": ("customizationWaypointIdArray" in options) ? options.customizationWaypointIdArray : []
				}
			);

			if (itemDbJson == 1) {
				//console.log("Skipping " + itemPath);
				continue;
			}
			else if (itemDbJson != -1) {
				customizationItemDbArray.push(itemDbJson);
			}
			else {
				throw "Error occurred while getting the DB-ready item JSON for " + itemPath;
			}
		}
		catch (error) {
			console.error("Error ", error, " encountered when trying to add ", customizationItemPathArray[k], "; continuing...");
			continue;
		}
	}
}

// This function accepts an array of items with their attachments and other performance variables and places the site JSONs in the customizationItemDbArray.
// headers: The headers used to access Waypoint endpoints.
// customizationCategory: One of the predefined category keys (e.g. KeyConstants.ARMOR_KEY)
// folderDict: The dictionary representing our media folder path, pregenerated.
// generalDictsAndArrays: The dictionaries and arrays containing prequeried information.
// categorySpecificDictsAndArrays: The dictionaries and array containing prequeried information specific to the customizationCategory.
// customizationItemDbArray: The output array of site JSONs for each item.
// customizationItemPathsProcessed: Array of item paths that have already been processed.
// itemAndAttachmentsArray: The array of items and their attachments pulled from a Waypoint JSON.
// The type object for the parent item.
// Within options:
// waypointThemePathToCoreDict: A dictionary that takes theme Waypoint paths and converts them to core names.
// isKitItem: Only true if the item belongs to a Kit.
// customizationWaypointIdArray: Array of Waypoint IDs, only really needed for Kit items.
// customizationWaypointIdArray: Array of Waypoint IDs for attachments, only really needed for Kit items.
async function generateJsonsFromItemAndAttachmentList(
	headers,
	customizationCategory,
	folderDict,
	generalDictsAndArrays,
	categorySpecificDictsAndArrays,
	customizationItemDbArray,
	customizationItemPathsProcessed,
	itemAndAttachmentsArray,
	type,
	options) {

	/* options can include (defaults shown here):
	 * waypointThemePathToCoreDict = {},			// Required for non-cross-core items.
	 * isKitItem = false,							// Required for kit items.
	 * customizationWaypointIdArray = [],			// Required for kit items and kits.
	 * customizationWaypointAttachmentIdArray = []  // Required for kit attachments, kits, and items with attachments.
	 */
	
	// We're working with an item type that has attachments. This means it's laid out a little differently. 
	// Before we can fetch the item details, we have to add the attachments to the DB. This is a little hacky, but what isn't at this point?
	// We'll generate a dictionary where the path of each item points to an array of attachment names.
	// Once we have that dictionary completed and all the attachment items added to their DB, we can proceed to work on the helmets.
	
	let parentPathToAttachmentArrayDict = {}; // The key of this dict will be the path to the attachment parent item, and its value will be an array of attachment names.
	let attachmentPathToIdDict = {}; // The keys will be attachment paths and the values will be the corresponding Waypoint IDs.
	let customizationItemAttachmentPathsProcessed = []; // As long as we can tie the attachment path to an ID, we don't have to process a path twice.
	let customizationItemAttachmentDbArray = []; // These are stored in a separate DB and can't be added with the regular ones.

	const TYPE_WAYPOINT_FIELD_ATTACHMENT_PARENT_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointFieldAttachmentParentField;

	for (let l = 0; l < itemAndAttachmentsArray.length; ++l) {
		const TYPE_WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointIdField;
		const TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketWaypointFieldAttachmentListField;

		let attachmentParentPath = itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_PARENT_FIELD]]; // TODO: Make this work for other attachments if they get added.
		let parentWaypointType = type[TYPE_WAYPOINT_ID_FIELD];
		let attachmentArray = []; // This is an array of attachment names specifically meant for the parentPathToAttachmentArrayDict.
		for (let m = 0; m < itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD]].OptionPaths.length; ++m) {
			try {
				let attachmentPath = itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD]].OptionPaths[m];
				let attachmentDbJson = await processItem(
					headers,
					ArmorConstants.ARMOR_ATTACHMENT_KEY,
					folderDict,
					generalDictsAndArrays,
					categorySpecificDictsAndArrays,
					attachmentPath,
					ITEM_TYPES.attachment,
					customizationItemAttachmentPathsProcessed,
					{
						"waypointThemePathToCoreDict": ("waypointThemePathToCoreDict" in options) ? options.waypointThemePathToCoreDict : {},
						"attachmentArray": attachmentArray,
						"attachmentPathToIdDict": attachmentPathToIdDict,
						"attachmentParentWaypointType": parentWaypointType,
						"isKitItem": ("isKitItem" in options) ? options.isKitItem : false,
						"customizationWaypointIdArray": ("customizationWaypointAttachmentIdArray" in options) ? options.customizationWaypointAttachmentIdArray : []
					}
				);

				if (attachmentDbJson == 1) {
					//console.log("Skipping " + attachmentPath);
					continue;
				}
				else if (attachmentDbJson != -1) {
					customizationItemAttachmentDbArray.push(attachmentDbJson);
				}
				else {
					throw "Error occurred while getting the DB-ready item JSON for " + itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD]].OptionPaths[m];
				}
			}
			catch (error) {
				console.error("Error ", error, " encountered when trying to add ", itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD]].OptionPaths[m], "; continuing...");
				continue;
			}
		}

		// Now that we've got all the attachment names for the item in an array, let's add it to the dictionary.
		parentPathToAttachmentArrayDict[attachmentParentPath] = attachmentArray;
	}

	// Time to check our work
	//console.log("Parent Path to Attachment Array Dict Contents: ", parentPathToAttachmentArrayDict);
	console.log("After obtaining all Attachment JSONs: ", customizationItemAttachmentDbArray);

	const ATTACHMENT_KEY = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].AttachmentKey;

	saveItemsToDbFromList(ATTACHMENT_KEY, customizationItemAttachmentDbArray, [type[TYPE_WAYPOINT_FIELD_ATTACHMENT_LIST_FIELD]]);

	// Now that the attachments have been added, we need to go back through and add the parent items as expected.
	for (let l = 0; l < itemAndAttachmentsArray.length; ++l) {
		try {
			let itemPath = itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_PARENT_FIELD]];
			let itemDbJson = await processItem(
				headers,
				customizationCategory,
				folderDict,
				generalDictsAndArrays,
				categorySpecificDictsAndArrays,
				itemPath,
				ITEM_TYPES.item,
				customizationItemPathsProcessed,
				{
					"waypointThemePathToCoreDict": ("waypointThemePathToCoreDict" in options) ? options.waypointThemePathToCoreDict : {},
					"attachmentArray": parentPathToAttachmentArrayDict[itemPath],
					"isKitItem": ("isKitItem" in options) ? options.isKitItem : false,
					"customizationWaypointIdArray": ("customizationWaypointAttachmentIdArray" in options) ? options.customizationWaypointAttachmentIdArray : [],
					"forceCheck": true // We need to force all checks to occur in case the list of attachments changed (ETag might still match in this case).
				}
			);

			if (itemDbJson == 1) {
				//console.log("Skipping " + itemPath);
				continue;
			}
			else if (itemDbJson != -1) {
				customizationItemDbArray.push(itemDbJson);
			}
			else {
				throw "Error occurred while getting the DB-ready item JSON for " + itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_PARENT_FIELD]];
			}
		}
		catch (error) {
			console.error("Error ", error, " encountered when trying to add ", itemAndAttachmentsArray[l][type[TYPE_WAYPOINT_FIELD_ATTACHMENT_PARENT_FIELD]], "; continuing...");
			continue;
		}
	}
}

// This function accepts an array of theme paths and other performance variables and places the site JSONs in the customizationItemDbArray.
// headers: The headers used to access Waypoint endpoints.
// customizationCategory: One of the predefined category keys (e.g. KeyConstants.ARMOR_KEY)
// folderDict: The dictionary representing our media folder path, pregenerated.
// generalDictsAndArrays: The dictionaries and arrays containing prequeried information.
// categorySpecificDictsAndArrays: The dictionaries and array containing prequeried information specific to the customizationCategory.
// customizationItemDbArray: The output array of site JSONs for each item.
// customizationItemPathsProcessed: Array of item paths that have already been processed.
// customizationItemPathArray: The array of item paths to process.
// coreName: The name of the parent core.
// waypointThemePathToCoreDict: A dictionary that takes theme Waypoint paths and converts them to core names.
async function generateJsonsFromThemeList(
	headers,
	customizationCategory,
	folderDict,
	generalDictsAndArrays,
	categorySpecificDictsAndArrays,
	customizationItemDbArray,
	customizationItemPathsProcessed,
	themePathArray,
	waypointGroupsToProcess,
	coreWaypointId = "",
	waypointThemePathToCoreDict = {}) {

	if (waypointGroupsToProcess.includes(CustomizationConstants.KIT_PROCESSING_KEY)) { // Skip the Kits if we aren't working on them.
		let kitPathsProcessed = []; // An array of Kit paths that have already been processed.
	
		// The key of this dict will be the path to the parent kit, and its value will be another dict with "attachments" and "items" for keys, each having an array of item Waypoint IDs as the value:
		//{
		//	[kitPath]: {
		//		attachments: [attachmentWaypointIdArray]
		//		items: [itemWaypointIdArray]
		//	} 
		//}
		let kitPathToItemArrayDict = {}; 
		let kitItemPathsProcessed = []; // As long as we can tie the attachment path to a name, we don't have to process a path twice.
		let kitItemDbArray = []; // These need to be added separately.
		
		for (let l = 0; l < themePathArray.length; ++l) {
			let kitPath = themePathArray[l];
			if (kitPathsProcessed.includes(kitPath)) {
				continue;
			}
			kitPathsProcessed.push(kitPath);

			let themeWaypointJson = await getCustomizationItem(headers, themePathArray[l]);

			if (themeWaypointJson.IsKit) { // Either we have a Kit or the default theme. If it's a kit, we just treat it like any other item.
				let customizationIdArray = []; // This is an array of Waypoint IDs specifically meant for the kitPathToItemArrayDict.
				let customizationAttachmentsIdArray = []; // This is similar to the previous array but contains attachment IDs.

				if (categorySpecificDictsAndArrays.length != 2) { // Ensure we can get the type array.
					console.error("categorySpecificDictsAndArrays does not have expected length of 2 in generateJsonsFromThemeList().");
				}

				let customizationTypeArray = categorySpecificDictsAndArrays[0]; // We only need this one for our purposes.

				const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketNameField;
				const TYPE_WAYPOINT_FIELD_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketWaypointFieldField;
				const TYPE_HAS_ATTACHMENTS_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketHasAttachmentsField;

				for (let i = 0; i < customizationTypeArray.length; ++i) {
					let type = customizationTypeArray[i];
					if (type[TYPE_NAME_FIELD] == "Any") {
						continue; // This isn't a real type.
					}

					let waypointTypeGroup = type[TYPE_WAYPOINT_FIELD_FIELD];

					if (!type[TYPE_HAS_ATTACHMENTS_FIELD]) {
						// Basically, if we aren't working with an attachment-supporting group.
						// We grab the array of waypoint paths, then process each one (so many nested for loops...)
						let customizationItemPathArray = themeWaypointJson[waypointTypeGroup].OptionPaths;

						await generateJsonsFromItemList(
							headers,
							customizationCategory,
							folderDict,
							generalDictsAndArrays,
							categorySpecificDictsAndArrays,
							kitItemDbArray,
							kitItemPathsProcessed,
							customizationItemPathArray,
							{
								"waypointThemePathToCoreDict": waypointThemePathToCoreDict,
								"isKitItem": true,
								"customizationWaypointIdArray": customizationIdArray
							}
						);
					}
					else {
						let itemAndAttachmentsArray = themeWaypointJson[waypointTypeGroup]["Options"];
						await generateJsonsFromItemAndAttachmentList(
							headers,
							customizationCategory,
							folderDict,
							generalDictsAndArrays,
							categorySpecificDictsAndArrays,
							kitItemDbArray,
							kitItemPathsProcessed,
							itemAndAttachmentsArray,
							type,
							{
								"waypointThemePathToCoreDict": waypointThemePathToCoreDict,
								"isKitItem": true,
								"customizationWaypointIdArray": customizationIdArray,
								"customizationWaypointAttachmentIdArray": customizationAttachmentsIdArray
							}
						);
					}
				}

				// Now that we've got all the item IDs for the Kit in arrays, let's add them to the dictionary.
				kitPathToItemArrayDict[kitPath] = {
					attachments: customizationAttachmentsIdArray,
					items: customizationIdArray
				};
				//console.log("Kit " + themeWaypointJson.CommonData.Title + " has Dict ", kitPathToItemArrayDict);
			}
		}

		// Time to check our work
		console.log("After obtaining all Kit Item JSONs: ", kitPathToItemArrayDict);

		// Work has been checked! Let's proceed to add the items.
		await saveItemsToDbFromList(customizationCategory, kitItemDbArray, waypointGroupsToProcess);

		// Now that the items have been added, we need to go back through and add the Kits (with the arrays of child items).
		for (let l = 0; l < themePathArray.length; ++l) {
			let themeWaypointJson = await getCustomizationItem(headers, themePathArray[l]);

			if (themeWaypointJson.IsKit) { // Either we have a Kit or the default theme. We only want to add Kits.
				try {
					let itemDbJson = await processItem(
						headers,
						customizationCategory,
						folderDict,
						generalDictsAndArrays,
						categorySpecificDictsAndArrays,
						themePathArray[l],
						ITEM_TYPES.kit,
						customizationItemPathsProcessed,
						{
							"coreWaypointId": coreWaypointId,
							"waypointThemePathToCoreDict": waypointThemePathToCoreDict,
							"kitChildItemArray": kitPathToItemArrayDict[themePathArray[l]].items,
							"kitChildAttachmentArray": kitPathToItemArrayDict[themePathArray[l]].attachments
						}
					);

					if (itemDbJson == 1) {
						//console.log("Skipping " + itemPath);
						continue;
					}
					else if (itemDbJson != -1) {
						customizationItemDbArray.push(itemDbJson);
					}
					else {
						throw "Error occurred while getting the DB-ready item JSON for " + themePathArray[l];
					}
				}
				catch (error) {
					console.error("Error ", error, " encountered when trying to add ", themePathArray[l], "; continuing...");
					continue;
				}
			}
		}
	}
	
	for (let j = 0; j < themePathArray.length; j++) { // For each theme.
		if (customizationItemPathsProcessed.includes(themePathArray[j])) { // If we already have the path in the array, we've processed this already. No need to do it twice.
			continue;
		}
		customizationItemPathsProcessed.push(themePathArray[j]); // Add this path to the array so we don't process it again.

		let themeWaypointJson = await getCustomizationItem(headers, themePathArray[j]);

		if (!themeWaypointJson.IsKit) { // This is the default theme. We want to iterate over each of its sub items. These are defined in a constant.
			if (categorySpecificDictsAndArrays.length != 2) { // Ensure we can get the type array.
				console.error("categorySpecificDictsAndArrays does not have expected length of 2 in generateJsonsFromThemeList().");
			}

			let customizationTypeArray = categorySpecificDictsAndArrays[0]; // We only need this one for our purposes.

			const TYPE_NAME_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketNameField;
			const TYPE_WAYPOINT_FIELD_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketWaypointFieldField;
			const TYPE_HAS_ATTACHMENTS_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS.SocketHasAttachmentsField;

			for (let i = 0; i < customizationTypeArray.length; ++i) {
				let type = customizationTypeArray[i];
				if (type[TYPE_NAME_FIELD] == "Any") {
					continue; // This isn't a real type.
				}

				if (!waypointGroupsToProcess.includes(type[TYPE_WAYPOINT_FIELD_FIELD])) {
					continue; // We'll get this in a different run.
				}

				let waypointTypeGroup = type[TYPE_WAYPOINT_FIELD_FIELD];

				if (!type[TYPE_HAS_ATTACHMENTS_FIELD]) {
					// Basically, if we aren't working with an attachment-supporting group.
					// We grab the array of waypoint paths, then process each one (so many nested for loops...)
					let customizationItemPathArray = themeWaypointJson[waypointTypeGroup].OptionPaths;
					await generateJsonsFromItemList(
						headers,
						customizationCategory,
						folderDict,
						generalDictsAndArrays,
						categorySpecificDictsAndArrays,
						customizationItemDbArray,
						customizationItemPathsProcessed,
						customizationItemPathArray,
						{
							"waypointThemePathToCoreDict": waypointThemePathToCoreDict
						}
					);					
				}
				else {
					// We're working with an item type that has attachments. This means it's laid out a little differently. 
					// Before we can fetch the item details, we have to add the attachments to the DB.
					// We'll generate a dictionary where the path of each item points to an array of attachment IDs.
					// Once we have that dictionary completed and all the attachment items added to their DB, we can proceed to work on the parent items.
					let itemAndAttachmentsArray = themeWaypointJson[waypointTypeGroup]["Options"];
					await generateJsonsFromItemAndAttachmentList(
						headers,
						customizationCategory,
						folderDict,
						generalDictsAndArrays,
						categorySpecificDictsAndArrays,
						customizationItemDbArray,
						customizationItemPathsProcessed,
						itemAndAttachmentsArray,
						type,
						{
							"waypointThemePathToCoreDict": waypointThemePathToCoreDict
						}
					);
				}

			}
		}
	}
}

// Saves the items in the customizationItemDbArray to their respective databases.
async function saveItemsToDbFromList(customizationCategory, customizationItemDbArray, waypointGroupsToProcess) {
	const CUSTOMIZATION_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
	const CORE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
	const ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationAttachmentReferenceField;
	const KIT_ITEM_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitItemReferenceField;
	const KIT_ATTACHMENT_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationKitAttachmentReferenceField;
	const EMBLEM_PALETTE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].EmblemPaletteReferenceField;
	const SOURCE_TYPE_REFERENCE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;

	console.log("Adding items for " + customizationCategory + " and groups", waypointGroupsToProcess, "Items:", customizationItemDbArray);

	for (let i = 0; i < customizationItemDbArray.length; ++i) {
		let options = {
			"suppressAuth": true,
			"suppressHooks": true
		};

		let customizationItemDbJson = customizationItemDbArray[i];

		let itemCopy = structuredClone(customizationItemDbJson); // Using structuredClone likely allows us to avoid having to add and re-add dates as we've had to do before.

		let retryItem = true;
		let retryCount = 0;
		const maxRetries = 10;

		while (retryItem && retryCount < maxRetries) {
			await wixData.save(CUSTOMIZATION_DB, itemCopy, options)
				.then (async (item) => {
					retryItem = false;
					console.log("Item added or updated: ", customizationItemDbJson);

					// This part may no longer be necessary thanks to structuredCopy.
					/*let temp = new Date(item.apiLastUpdatedDatetime);
					item.apiLastUpdatedDatetime = temp;

					wixData.update(CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb, item, options)
						.catch((error) => {
							console.error("Failed to add datetime for this item", itemCopy, "due to error", error);
						});*/

					if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory) &&
						CORE_REFERENCE_FIELD in customizationItemDbJson) {
						//console.log("Adding core references for " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
						
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.replaceReferences(CUSTOMIZATION_DB, CORE_REFERENCE_FIELD, item._id, customizationItemDbJson[CORE_REFERENCE_FIELD], options)
								.then(() => {
									retry = false;
									//console.log("Core references added for ", customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
								})
								.catch((error) => {
									console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was replacing core references for ", item._id, " in ", 
										CUSTOMIZATION_DB, " with ", customizationItemDbJson[CORE_REFERENCE_FIELD]);
								});
						}
					}

					if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory) &&
						ATTACHMENT_REFERENCE_FIELD in customizationItemDbJson &&
						customizationItemDbJson[ATTACHMENT_REFERENCE_FIELD].length > 0) {
						//console.log("Item " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField] + " has attachments. Adding now.");
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.replaceReferences(CUSTOMIZATION_DB, ATTACHMENT_REFERENCE_FIELD, item._id, customizationItemDbJson[ATTACHMENT_REFERENCE_FIELD], options)
								.then(() => {
									retry = false;
									//console.log("Attachment references added for ", customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
								})
								.catch((error) => {
									console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was replacing attachment references for ", item._id, 
										" in ", CUSTOMIZATION_DB, " with ", customizationItemDbJson[ATTACHMENT_REFERENCE_FIELD]);
								});
						}
					}

					if (CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory) &&
						KIT_ITEM_REFERENCE_FIELD in customizationItemDbJson &&
						customizationItemDbJson[KIT_ITEM_REFERENCE_FIELD].length > 0) {
						//console.log("Kit " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField] + " has child items. Adding now.");
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.replaceReferences(CUSTOMIZATION_DB, KIT_ITEM_REFERENCE_FIELD, item._id, customizationItemDbJson[KIT_ITEM_REFERENCE_FIELD], options)
								.then(() => {
									retry = false;
									//console.log("Kit item references added for ", customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
								})
								.catch((error) => {
									console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was replacing Kit item references for ",
										customizationItemDbJson._id, " in ", CUSTOMIZATION_DB, " with ", customizationItemDbJson[KIT_ITEM_REFERENCE_FIELD]);
								});
						}

						if (CustomizationConstants.HAS_ATTACHMENTS_ARRAY.includes(customizationCategory) &&
							KIT_ATTACHMENT_REFERENCE_FIELD in customizationItemDbJson &&
							customizationItemDbJson[KIT_ATTACHMENT_REFERENCE_FIELD].length > 0) {
							//console.log("Kit " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField] + 
							//	" has child attachments. Adding now.");
							let retry = true;
							let retryCount = 0;

							while (retry && retryCount < maxRetries) {
								await wixData.replaceReferences(CUSTOMIZATION_DB, KIT_ATTACHMENT_REFERENCE_FIELD, item._id, customizationItemDbJson[KIT_ATTACHMENT_REFERENCE_FIELD], options)
									.then(() => {
										retry = false;
										//console.log("Kit attachment references added for ", 
										//	customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
									})
									.catch((error) => {
										console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was replacing Kit attachment references for ",
											customizationItemDbJson._id, " in ", CUSTOMIZATION_DB, " with ", customizationItemDbJson[KIT_ATTACHMENT_REFERENCE_FIELD]);
									});
							}
						}
					}

					if ((customizationItemDbJson[SOURCE_TYPE_REFERENCE_FIELD] &&
						customizationItemDbJson[SOURCE_TYPE_REFERENCE_FIELD].length > 0)) {
						// If the item has the source type reference field, it's a new item. We need to insert the references.
						//console.log("New item: " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField] + " has sources ", 
						//	customizationItemDbJson.sourceTypeReference);
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.insertReference(CUSTOMIZATION_DB, SOURCE_TYPE_REFERENCE_FIELD, item._id, customizationItemDbJson[SOURCE_TYPE_REFERENCE_FIELD], options)
								.then(() => {
									retry = false;
									//console.log("Source type references added for ", customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
								})
								.catch((error) => {
									console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was adding source type references for ",
										customizationItemDbJson._id, " in ", CUSTOMIZATION_DB, " with ", customizationItemDbJson[SOURCE_TYPE_REFERENCE_FIELD]);
								});
						}
					}

					if (CustomizationConstants.HAS_EMBLEM_PALETTES_ARRAY.includes(customizationCategory) &&
						customizationItemDbJson[EMBLEM_PALETTE_REFERENCE_FIELD] &&
						customizationItemDbJson[EMBLEM_PALETTE_REFERENCE_FIELD].length > 0) {
						 // If the item has the Emblem Palette reference field, we need to insert the references.
						//console.log("Emblem: " + customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField] + " has palettes ", customizationItemDbJson[emblemPaletteReferenceField]);
						let retry = true;
						let retryCount = 0;

						while (retry && retryCount < maxRetries) {
							await wixData.replaceReferences(CUSTOMIZATION_DB, EMBLEM_PALETTE_REFERENCE_FIELD, item._id, customizationItemDbJson[EMBLEM_PALETTE_REFERENCE_FIELD], options)
								.then(() => {
									retry = false;
									//console.log("Emblem palette references added for ", customizationItemDbJson[CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField]);
								})
								.catch((error) => {
									console.error("Error ", error, " occurred. Try " + (++retryCount) + " of " + maxRetries + ". Was adding Emblem palette references for ",
										customizationItemDbJson._id, " in ", CUSTOMIZATION_DB, " with ", customizationItemDbJson[EMBLEM_PALETTE_REFERENCE_FIELD]);
								});
						}
					}
				})
				.catch((error) => {
					console.error("Error ", error, " occurred when adding this item to DB. Try " + (++retryCount) + " of " + maxRetries + ": ", customizationItemDbArray[i]);
				});
		}
	}
}

// This function is going to basically run the getCustomizationItemToSave function repeatedly on each item JSON returned and then save those JSONs to the DB.
// It uses the customizationCategory to get the list of items pertaining to that category.
// The waypointGroupsToProcess limits what we process in this execution.
async function updateDbsFromApi(headers, customizationCategory, waypointGroupsToProcess, generalDictsAndArrays, categorySpecificDictsAndArrays) {
	let folderDict; // This will be passed to our image grabbing function.
	let results = await wixData.query(KeyConstants.KEY_VALUE_DB) // This might still be a bit inefficient. Consider moving query out and passing folderDict as arg.
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY)
		.find()

	if (results.items.length > 0) {
		folderDict = results.items[0].value;
	}
	else {
		throw "Could not retrieve folder dict. Cannot get customization image urls.";
	}

	switch (customizationCategory) {
		case ArmorConstants.ARMOR_KEY:
		case WeaponConstants.WEAPON_KEY:
		case VehicleConstants.VEHICLE_KEY:
		case BodyAndAiConstants.BODY_AND_AI_KEY:
		case SpartanIdConstants.SPARTAN_ID_KEY:
			break;
		default:
			throw "Unable to process customization category " + customizationCategory + " at this time.";
	}

	let coreList = [];
	if (customizationCategory == ArmorConstants.ARMOR_KEY) {
		// With armor cores, the JSON returned is in a slightly different format that we need to standardize.
		let armorCoreObjectList = await getArmorCoreList(headers);
		armorCoreObjectList.forEach((armorCoreObject) => {
			coreList.push(armorCoreObject.CoreCMSPath);
		});
	}
	else if (customizationCategory == WeaponConstants.WEAPON_KEY || customizationCategory == VehicleConstants.VEHICLE_KEY) {
		coreList = await getCoreList(headers, customizationCategory);
	}
	
	let customizationItemDbArray = []; // This will store each item JSON to be added or updated in the DB.

	if (CustomizationConstants.HAS_CORE_ARRAY.includes(customizationCategory)) {
		let coreWaypointJsonArray = [];
		let coreDbJsonArray = [];
		let waypointThemePathToCoreDict = {};
		if (waypointGroupsToProcess.includes(CustomizationConstants.CORE_PROCESSING_KEY)) {
			// We want to do two things with this iteration: get each JSON for insertion/update into the core DB, and create the waypointThemePathToCoreDict.
			// The keys will be the Waypoint Paths to each child theme, and the values will be the corresponding core name.
			try{
				let corePathsProcessed = [];

				for (let i = 0; i < coreList.length; i++) {
					try {

						let coreSiteJson = await processItem(
							headers,
							customizationCategory,
							folderDict,
							generalDictsAndArrays,
							categorySpecificDictsAndArrays,
							coreList[i],
							CustomizationConstants.ITEM_TYPES.core,
							corePathsProcessed,
							{
								"waypointThemePathToCoreDict": waypointThemePathToCoreDict,
								"coreWaypointJsonArray": coreWaypointJsonArray
							}
						);

						if (coreSiteJson == 1) {
							//console.log("Skipping " + coreList[i]);
							continue;
						}
						else if (coreSiteJson != -1) {
							coreDbJsonArray.push(coreSiteJson);
						}
						else {
							throw "Error occurred while getting the DB-ready core item JSON.";
						}
					}
					catch (error) {
						console.error("Error ", error, " encountered when trying to add ", coreList[i], "; continuing...");
						continue;
					}
				}
			}
			catch (error) {
				console.error(error);
				// Because we're dealing with modifications to the DB, if we get a major error of any kind, we need to GTFO.
				return -1;
			}

			console.log("After obtaining all Core JSONs: ", coreDbJsonArray);

			// It's time to save the Core entries to the Core DB.
			const CORE_DB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreDb;
			await wixData.bulkSave(CORE_DB, coreDbJsonArray)
				.then((results) => {
					console.log("After Core DB Save: " + results.inserted + " inserted, " + results.updated + " updated, " + results.skipped + " skipped.");
					console.log("Inserted IDs: " + results.insertedItemIds);
					console.log("Updated IDs: " + results.updatedItemIds);
					if (results.errors.length > 0) {
						console.error("Errors: " + results.errors);
					}
				})
				.catch((error) => {
					console.error(error);
				});

			return 0; // We only want to process Cores, so we get out when we're done.
		}
		else { // If we don't want to add the cores, we just need to get the array of core JSONs.
			for (let i = 0; i < coreList.length; i++) {
				try {
					let coreWaypointJson = await getCustomizationItem(headers, coreList[i]);
					coreWaypointJsonArray.push(coreWaypointJson);
					coreWaypointJson.Themes.OptionPaths.forEach((waypointThemePath) => {
							waypointThemePathToCoreDict[waypointThemePath] = coreWaypointJson.CommonData.Id;
						});
				}
				catch (error) {
					console.error("Error occurred while retrieving core list: " + error);
					return -1;
				}
			}
		}

		// Okay, so now we've gotten all the Cores added. Next, we need to grab each theme, listed in the Themes.OptionPaths array for each core, and check if it's a Kit. 
		// If it is, we have to do some special stuff. Otherwise, we pull its constituent parts out and treat each of those as an item. 
		// There's an easy way to check this with the IsKit field.
		let customizationItemPathsProcessed = []; // If we already have a path in this array, we don't need to process it again.

		try{
			for (let i = 0; i < coreWaypointJsonArray.length; i++) {
				let coreWaypointId = coreWaypointJsonArray[i].CommonData.Id; // We need to store the core ID for future use.
				let themePathArray = coreWaypointJsonArray[i].Themes.OptionPaths;

				await generateJsonsFromThemeList(
					headers,
					customizationCategory,
					folderDict,
					generalDictsAndArrays,
					categorySpecificDictsAndArrays,
					customizationItemDbArray,
					customizationItemPathsProcessed,
					themePathArray,
					waypointGroupsToProcess,
					coreWaypointId,
					waypointThemePathToCoreDict
				);
			}

			//console.log("After obtaining all JSONs for these Waypoint Groups: ", waypointGroupsToProcess, ", we got this Array: ", customizationItemDbArray);
		}
		catch (error) {
			console.error(error);
			// Because we're dealing with modifications to the DB, if we get an error of any kind, we need to GTFO.
			return -1;
		}
	}
	else if (customizationCategory != KeyConstants.SPARTAN_ID_KEY) { // For right now, this case only applies to Body & AI, but it could also apply to other customization categories in the future.
		let themePathArray = await getThemeList(headers, customizationCategory);
		let customizationItemPathsProcessed = []; // If we already have a path in this array, we don't need to process it again.

		await generateJsonsFromThemeList(
			headers,
			customizationCategory,
			folderDict,
			generalDictsAndArrays,
			categorySpecificDictsAndArrays,
			customizationItemDbArray,
			customizationItemPathsProcessed,
			themePathArray,
			waypointGroupsToProcess
		);
	}
	else { // This applies for theme-less customization categories (i.e. Spartan ID).
		let customizationItemPathArray = await getSpartanIdPathList(headers, categorySpecificDictsAndArrays, waypointGroupsToProcess);
		let customizationItemPathsProcessed = [];

		/*let spartanIdWaypointTypes = ["SpartanActionPose", "SpartanBackdropImage", "SpartanEmblem"];

		for (let i = 0; i < spartanIdWaypointTypes.length; ++i) {
			let additionalItemPaths = await Waypoint.getListOfCustomizationPathsByType(spartanIdWaypointTypes[i]);
			for (let k = 0; k < additionalItemPaths.length; ++k) {
				if (!customizationItemPathArray.includes(additionalItemPaths[k])) {
					console.log("Found additional " + spartanIdWaypointTypes[i] + ": " + additionalItemPaths[k]);
					customizationItemPathArray.push(additionalItemPaths[k]);
				}
			}
		}*/

		await generateJsonsFromItemList(
			headers,
			customizationCategory,
			folderDict,
			generalDictsAndArrays,
			categorySpecificDictsAndArrays,
			customizationItemDbArray,
			customizationItemPathsProcessed,
			customizationItemPathArray
		);
	}

	// It's time to save the entries to the Customization DB.
	await saveItemsToDbFromList(customizationCategory, customizationItemDbArray, waypointGroupsToProcess);
}

export async function importManufacturers(headers) {
	let folderDict; // This will be passed to our image grabbing function. 
	let results = await wixData.query(KeyConstants.KEY_VALUE_DB) // This might still be a bit inefficient. Consider moving query out and passing folderDict as arg.
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY)
		.find();

	if (results.items.length > 0) {
		folderDict = results.items[0].value;
	}
	else {
		throw "Could not retrieve folder dict. Cannot get customization image urls.";
	}

	let metadataWaypointJson = await getCustomizationItem(headers, ApiConstants.WAYPOINT_URL_SUFFIX_PROGRESSION_METADATA);
	let manufacturerArray = metadataWaypointJson.Manufacturers;

	let manufacturerDbArray = [];

	let manufacturerDbResults = await wixData.query(CustomizationConstants.MANUFACTURER_DB).find();

	let manufacturerDbNameArray = [];

	// Add the existing Manufacturer names to an array.
	for (let i = 0; i < manufacturerDbResults.items.length; ++i){
		manufacturerDbNameArray.push(manufacturerDbResults.items[i].manufacturer);
	}

	// Manufacturer DB JSONs have two fields we're interested in adding: the name and image of the manufacturer. The manufacturers are listed alphabetically, which simplifies things.
	for (let i = 0; i < manufacturerArray.length; ++i) {
		if (manufacturerDbNameArray.includes(manufacturerArray[i].ManufacturerName)) { 
			// We're not going to process existing manufacturers since we don't have a good way to automatically recollect the Manufacturer Image when it changes.
			// To grab new info, delete the image from the file directory and delete the manufacturer from the DB (don't do this around 9:00 A.M. PST/8:00 A.M. PDT though.)
			continue;
		}

		let manufacturerDbJson = {
			[CustomizationConstants.MANUFACTURER_FIELD]: manufacturerArray[i].ManufacturerName,
			[CustomizationConstants.MANUFACTURER_IMAGE_FIELD]: await getCustomizationImageUrl(
				folderDict,
				headers,
				manufacturerArray[i].ManufacturerName,
				manufacturerArray[i].ManufacturerLogoImage,
				"image/png",
				CustomizationConstants.MANUFACTURER_KEY,
				null)
		}

		manufacturerDbArray.push(manufacturerDbJson);
	}

	if (manufacturerDbArray.length > 0) {
		await wixData.bulkInsert(CustomizationConstants.MANUFACTURER_DB, manufacturerDbArray)
		.then((results) => {
			console.log("Manufacturers have been inserted with these results: ", results);
		});
	}
}

export async function armorImport(headers = null, manufacturerImportCompleted = false) {
	if (!headers) {
		headers = await makeWaypointHeaders(); // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
	}

	if (!manufacturerImportCompleted) {
		await importManufacturers(headers); // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
	}

	let generalDictsAndArrays = await getGeneralDictsAndArraysFromDbs(headers);

	// Add the cores first.
	let customizationCategory = ArmorConstants.ARMOR_KEY;
	let returnCode = await updateDbsFromApi(headers, customizationCategoryArmor, [CustomizationConstants.CORE_PROCESSING_KEY], generalDictsAndArrays, null)
		.catch((error) => {
			console.error("Error occurred while processing Cores for " + customizationCategory, error);
			return -1;
		});

	if (!returnCode) { // Return code 0 means success.
		let categorySpecificDictsAndArrays = await getCategorySpecificDictsAndArraysFromDbs(customizationCategory);

		// Add the Kits next.
		returnCode = await updateDbsFromApi(headers, customizationCategoryArmor, [CustomizationConstants.KIT_PROCESSING_KEY], generalDictsAndArrays, categorySpecificDictsAndArrays)
			.catch((error) => {
				console.error("Error occurred while processing Kits for " + customizationCategory, error);
				return -1;
			});

		if (!returnCode) {
			let processingGroups = [
				["Coatings"],
				["Emblems"],
				["Visors", "LeftShoulderPads", "RightShoulderPads", "Gloves", "KneePads"]
				["Helmets", "ChestAttachments", "WristAttachments", "HipAttachments", "ArmorFx", "MythicFx"]
			];

			processingGroups.forEach((processingGroup) => {
				updateDbsFromApi(headers, customizationCategory, processingGroup, generalDictsAndArrays, categorySpecificDictsAndArrays)
					.then(() => console.log("Finished processing ", processingGroup, " for " + customizationCategory))
					.catch((error) => console.error("Error occurred while processing ", processingGroup, " for " + customizationCategory, error));
			});
		}
		else {
			console.error("Unable to process items for " + customizationCategory + " due to failure to add Kits.");
		}
	}
	else { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
		console.error("Unable to process items for " + customizationCategory + " due to failure to add Cores.");
	}
}

export async function weaponImport(headers = null, manufacturerImportCompleted = false) {
	if (!headers) {
		headers = await makeWaypointHeaders(); // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
	}

	if (!manufacturerImportCompleted) {
		await importManufacturers(headers); // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
	}

	let generalDictsAndArrays = await getGeneralDictsAndArraysFromDbs(headers);

	// Add the cores first.
	let customizationCategory = WeaponConstants.WEAPON_KEY;
	let returnCode = await updateDbsFromApi(headers, customizationCategoryArmor, [CustomizationConstants.CORE_PROCESSING_KEY], generalDictsAndArrays, null)
		.catch((error) => {
			console.error("Error occurred while processing Cores for " + customizationCategory, error);
			return -1;
		});

	if (!returnCode) { // Return code 0 means success.
		let categorySpecificDictsAndArrays = await getCategorySpecificDictsAndArraysFromDbs(customizationCategory);

		// Add the Kits next.
		returnCode = await updateDbsFromApi(headers, customizationCategoryArmor, [CustomizationConstants.KIT_PROCESSING_KEY], generalDictsAndArrays, categorySpecificDictsAndArrays)
			.catch((error) => {
				console.error("Error occurred while processing Kits for " + customizationCategory, error);
				return -1;
			});

		if (!returnCode) {
			let processingGroups = [
				["Coatings"],
				["Emblems"],
				["WeaponCharms", "DeathFx", "AlternateGeometryRegions"]
			];

			processingGroups.forEach((processingGroup) => {
				updateDbsFromApi(headers, customizationCategory, processingGroup, generalDictsAndArrays, categorySpecificDictsAndArrays)
					.then(() => console.log("Finished processing ", processingGroup, " for " + customizationCategory))
					.catch((error) => console.error("Error occurred while processing ", processingGroup, " for " + customizationCategory, error));
			});
		}
		else {
			console.error("Unable to process items for " + customizationCategory + " due to failure to add Kits.");
		}
	}
	else { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
		console.error("Unable to process items for " + customizationCategory + " due to failure to add Cores.");
	}

	/*makeWaypointHeaders()
		.then((headers) => { // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
			importManufacturers(headers) // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
				.then(() => {
					getGeneralDictsAndArraysFromDbs(headers)
						.then((generalDictsAndArrays) => {
							let customizationCategoryWeapon = KeyConstants.WEAPON_KEY;
							updateDbsFromApi(headers, customizationCategoryWeapon, [], generalDictsAndArrays, null)
								.then((returnCode) => {
									if (!returnCode) { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
										getCategorySpecificDictsAndArraysFromDbs(customizationCategoryWeapon)
											.then((categorySpecificDictsAndArrays) => {
												updateDbsFromApi(headers, customizationCategoryWeapon, [CustomizationConstants.KIT_PROCESSING_KEY], generalDictsAndArrays, categorySpecificDictsAndArrays)
													.then((returnCode) => {
														if (!returnCode) { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
															updateDbsFromApi(headers, customizationCategoryWeapon, ["Coatings"], generalDictsAndArrays, categorySpecificDictsAndArrays)
																.then(() => console.log("Finished adding ", ["Coatings"], " for " + customizationCategoryWeapon));
															updateDbsFromApi(headers, customizationCategoryWeapon, ["Emblems"], generalDictsAndArrays, categorySpecificDictsAndArrays)
																.then(() => console.log("Finished adding ", ["Emblems"], " for " + customizationCategoryWeapon));
															updateDbsFromApi(headers, customizationCategoryWeapon, ["WeaponCharms", "DeathFx", "AlternateGeometryRegions"], generalDictsAndArrays, categorySpecificDictsAndArrays)
																.then(() => console.log("Finished adding ", ["WeaponCharms", "DeathFx", "AlternateGeometryRegions"], 
																	" for " + customizationCategoryWeapon));
														}
														else {
															console.error("Unable to process Weapon items due to failure to add Kits.");
														}
													})
													.catch(error => {
														console.error("Failed to add Weapon Kits due to " + error);
													});
											});
									}
									else {
										console.error("Unable to process Weapon items due to failure to add Cores.");
									}
								});
						});
				});
		});
		*/
}

export async function vehicleImport(headers = null, manufacturerImportCompleted = false) {
	if (!headers) {
		headers = await makeWaypointHeaders(); // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
	}

	if (!manufacturerImportCompleted) {
		await importManufacturers(headers); // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
	}

	let generalDictsAndArrays = await getGeneralDictsAndArraysFromDbs(headers);

	// Add the cores first.
	let customizationCategory = VehicleConstants.VEHICLE_KEY;
	let returnCode = await updateDbsFromApi(headers, customizationCategoryArmor, [CustomizationConstants.CORE_PROCESSING_KEY], generalDictsAndArrays, null)
		.catch((error) => {
			console.error("Error occurred while processing Cores for " + customizationCategory, error);
			return -1;
		});

	if (!returnCode) { // Return code 0 means success.
		let categorySpecificDictsAndArrays = await getCategorySpecificDictsAndArraysFromDbs(customizationCategory);

		let processingGroups = [
			["Coatings"],
			["Emblems"],
			["AlternateGeometryRegions"]
		];

		processingGroups.forEach((processingGroup) => {
			updateDbsFromApi(headers, customizationCategory, processingGroup, generalDictsAndArrays, categorySpecificDictsAndArrays)
				.then(() => console.log("Finished processing ", processingGroup, " for " + customizationCategory))
				.catch((error) => console.error("Error occurred while processing ", processingGroup, " for " + customizationCategory, error));
		});
	}
	else { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
		console.error("Unable to process items for " + customizationCategory + " due to failure to add Cores.");
	}

	/*makeWaypointHeaders()
		.then((headers) => { // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
			importManufacturers(headers) // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
				.then(() => {
					getGeneralDictsAndArraysFromDbs(headers)
						.then((generalDictsAndArrays) => {
							let customizationCategoryVehicle = KeyConstants.VEHICLE_KEY;
							updateDbsFromApi(headers, customizationCategoryVehicle, [CustomizationConstants.CORE_PROCESSING_KEY], generalDictsAndArrays, null)
								.then((returnCode) => {
									if (!returnCode) { // If we weren't successful in adding the Cores, we probably won't have the necessary information to successfully add items. Might as well be done.
										getCategorySpecificDictsAndArraysFromDbs(customizationCategoryVehicle)
											.then((categorySpecificDictsAndArrays) => {
												updateDbsFromApi(headers, customizationCategoryVehicle, ["Coatings"], generalDictsAndArrays, categorySpecificDictsAndArrays)
													.then(() => console.log("Finished adding ", ["Coatings"], " for " + customizationCategoryVehicle));
												updateDbsFromApi(headers, customizationCategoryVehicle, ["Emblems"], generalDictsAndArrays, categorySpecificDictsAndArrays)
													.then(() => console.log("Finished adding ", ["Emblems"], " for " + customizationCategoryVehicle));
												updateDbsFromApi(headers, customizationCategoryVehicle, ["AlternateGeometryRegions"], generalDictsAndArrays, categorySpecificDictsAndArrays)
													.then(() => console.log("Finished adding ", ["AlternateGeometryRegions"], " for " + customizationCategoryVehicle));
											});
									}
									else {
										console.error("Unable to process Vehicle items due to failure to add Cores.");
									}
								});
						});
				});
		});
		*/
}

export async function bodyAiImport(headers = null, manufacturerImportCompleted = false) {
	if (!headers) {
		headers = await makeWaypointHeaders(); // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
	}

	if (!manufacturerImportCompleted) {
		await importManufacturers(headers); // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
	}

	let generalDictsAndArrays = await getGeneralDictsAndArraysFromDbs(headers);

	// Add the cores first.
	let customizationCategory = BodyAndAiConstants.BODY_AND_AI_KEY;

	let categorySpecificDictsAndArrays = await getCategorySpecificDictsAndArraysFromDbs(customizationCategory);

	let processingGroups = [
		["Models", "Colors"]
	];

	processingGroups.forEach((processingGroup) => {
		updateDbsFromApi(headers, customizationCategory, processingGroup, generalDictsAndArrays, categorySpecificDictsAndArrays)
			.then(() => console.log("Finished processing ", processingGroup, " for " + customizationCategory))
			.catch((error) => console.error("Error occurred while processing ", processingGroup, " for " + customizationCategory, error));
	});

	/*makeWaypointHeaders()
		.then((headers) => { // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
			importManufacturers(headers) // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
				.then(() => {
					getGeneralDictsAndArraysFromDbs(headers)
						.then((generalDictsAndArrays) => {
							let customizationCategoryBodyAndAi = KeyConstants.BODY_AND_AI_KEY;
							getCategorySpecificDictsAndArraysFromDbs(customizationCategoryBodyAndAi)
								.then((categorySpecificDictsAndArrays) => {
									updateDbsFromApi(headers, customizationCategoryBodyAndAi, ["Models", "Colors"], generalDictsAndArrays, categorySpecificDictsAndArrays)
										.then(() => console.log("Finished adding ", ["Models", "Colors"], " for " + customizationCategoryBodyAndAi));
								});
						});
				});
		});	
		*/
}

export async function spartanIdImport(headers = null, manufacturerImportCompleted = false) {
	if (!headers) {
		headers = await makeWaypointHeaders(); // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
	}

	if (!manufacturerImportCompleted) {
		await importManufacturers(headers); // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
	}

	let generalDictsAndArrays = await getGeneralDictsAndArraysFromDbs(headers);

	// Add the cores first.
	let customizationCategory = SpartanIdConstants.SPARTAN_ID_KEY;

	let categorySpecificDictsAndArrays = await getCategorySpecificDictsAndArraysFromDbs(customizationCategory);

	let processingGroups = [
		["SpartanActionPose", "SpartanBackdropImage"],
		["SpartanEmblem"]
	];

	processingGroups.forEach((processingGroup) => {
		updateDbsFromApi(headers, customizationCategory, processingGroup, generalDictsAndArrays, categorySpecificDictsAndArrays)
			.then(() => console.log("Finished processing ", processingGroup, " for " + customizationCategory))
			.catch((error) => console.error("Error occurred while processing ", processingGroup, " for " + customizationCategory, error));
	});

	/*makeWaypointHeaders()
		.then((headers) => { // Getting the headers once and then using them a bunch is way more efficient than getting them for each request.
			importManufacturers(headers) // We're going to import the manufacturers before anything else. This isn't a super lengthy process, but will take a few seconds.
				.then(() => {
					getGeneralDictsAndArraysFromDbs(headers)
						.then((generalDictsAndArrays) => {
							let customizationCategorySpartanId = KeyConstants.SPARTAN_ID_KEY;
							getCategorySpecificDictsAndArraysFromDbs(customizationCategorySpartanId)
								.then((categorySpecificDictsAndArrays) => {
									updateDbsFromApi(headers, customizationCategorySpartanId, ["ActionPoses", "Emblems", "BackdropImages"], generalDictsAndArrays, categorySpecificDictsAndArrays)
										.then(() => console.log("Finished adding ", ["ActionPoses", "Emblems", "BackdropImages"], " for " + customizationCategorySpartanId));
								});
						});
				});
		});
		*/
}

export function generalCustomizationImport() {
	makeWaypointHeaders()
		.then((headers) => {
			importManufacturers(headers)
				.then(() => {
					armorImport(headers, true);
					weaponImport(headers, true);
					vehicleImport(headers, true);
					bodyAiImport(headers, true);
					spartanIdImport(headers, true);
				});
		});
}