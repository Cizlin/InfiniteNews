// Import Wix libraries.
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';

// Import Constants.
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

import * as KeyConstants from 'public/Constants/KeyConstants.js';
import * as ApiConstants from 'public/Constants/ApiConstants.js';
import * as GeneralConstants from 'public/Constants/GeneralConstants.js';

import * as ShopConstants from 'public/Constants/ShopConstants.js';
//#endregion


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
		"/": {}
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
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY, "value": folderDict });
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
	// CUSTOMIZATION_CATEGORY_FOLDER_DICT[customizationCategory]/						  If not Shop or Pass, else use SHOP_FOLDER or PASS_FOLDER, respectively.
	// CUSTOMIZATION_TYPE_FOLDER_DICT[customizationCategory][customizationType]/ 		  If not Consumable, Emblem Palette, or Manufacturer
	// OR
	// [TypeFolderFromTypeDB]															  If Armor, Weapon, Vehicle, Body & AI, or Spartan ID and not Core
	// OR
	// [CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreFolder]/					  If Core.
	// customizationCore/ 																  If not core agnostic or non-core
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

	//console.log(customizationCategory, CustomizationConstants.CUSTOMIZATION_CATEGORY_FOLDER_DICT);
	const CATEGORY_FOLDER = CustomizationConstants.CUSTOMIZATION_CATEGORY_FOLDER_DICT[customizationCategory];
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

			const TYPE_FOLDER = CustomizationConstants.CUSTOMIZATION_TYPE_FOLDER_DICT[customizationCategory][customizationType];
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
			if (!(categorySpecificDictsAndArrays) || categorySpecificDictsAndArrays.length != 3) { // We expect 3 dicts/arrays in this construct, even though we only really need 1.
				console.error("Unexpected length for categorySpecificDictsAndArrays. Expected 3, got ", categorySpecificDictsAndArrays.length);
			}

			let customizationTypeArray = categorySpecificDictsAndArrays[0]; // The customization types for this category.

			// The folder matching the specified customization type.
			let typeFolder = "";

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
				let isPartialCrossCore = false;

				const TYPE_IS_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsCrossCoreField;
				const TYPE_IS_PARTIAL_CROSS_CORE_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketIsPartialCrossCoreField;

				customizationTypeArray.some((type) => {
					// If our matching type is cross-core, mark our flag true and exit.
					if (type[TYPE_NAME_FIELD] == customizationType) {
						isCrossCore = type[TYPE_IS_CROSS_CORE_FIELD];
						isPartialCrossCore = type[TYPE_IS_PARTIAL_CROSS_CORE_FIELD];
						return true;
					}
				})

				if (!isCrossCore && !isPartialCrossCore) {
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

	let fileSystemSafeTitle = title.replace(/[\\/?:]/g, "_"); // Clean out some of the common illegal characters (\, /, ?, :).
	let filenameType = (customizationCategory == ShopConstants.SHOP_KEY) ? "Bundle" :  // If this is a Shop Bundle, the type in the name is Bundle.
		(customizationType == CustomizationConstants.ITEM_TYPES.core) ? CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreType : // If core, [CoreType].
			customizationType; // Otherwise it is the type provided by the caller.

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