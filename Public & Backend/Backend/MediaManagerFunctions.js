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

// Returns the ETag provided by the headers of a remote image file.
export async function getETag(headers, waypointPath, urlBase = ApiConstants.WAYPOINT_URL_BASE_IMAGE) {
	var https = require('https');

	let httpOptions = {
		method: "HEAD",
		headers: headers,
		timeout: 10000
	};

	return new Promise((resolve, reject) => {
		let request = https.request(urlBase + waypointPath, httpOptions, (response) => {
			let { statusCode, headers } = response;
			//console.log(`statusCode: ${statusCode}`)
			//console.log("ETag from headers: " + headers.etag);

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

			resolve(headers.etag);
		});

		request.on('error', error => {
			console.error(`Got error: ${error.message} while fetching image ETag at ${waypointPath}.`);
			reject(error); // Assume the ETag doesn't match so we can try again.
		});

		request.end();
	});
}

// Retrieves an item's image from the Waypoint API. Returns the Wix URL to the stored image. This is returned as a Promise that resolves to the URL on success.
export async function addCustomizationImageToMediaManager(requestHeaders, waypointPath, mimeType, mediaManagerPath, fileName, urlBase = ApiConstants.WAYPOINT_URL_BASE_IMAGE) {
	var https = require('https');

	let httpOptions = {
		headers: requestHeaders,
		timeout: 10000,
		maxBodyLength: Infinity
	};

	// If no waypoint path was defined, we need to resolve the promise with the placeholder image URL.
	if (!waypointPath || waypointPath == "") {
		return Promise.resolve([CustomizationConstants.PLACEHOLDER_IMAGE_URL, ""]);
	}

	return new Promise((resolve, reject) => {
		let request = https.get(urlBase + waypointPath, httpOptions, (response) => {
			let { statusCode, headers } = response;
			console.log(`statusCode: ${statusCode}`);
			console.log("ETag from headers:" + headers.etag);

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

					resolve([imageInfo.fileUrl, headers.etag]);
				}
				catch (e) {
					console.error("Got error " + e + " while trying to upload image for " + fileName + ". Using placeholder image.");
					resolve([CustomizationConstants.PLACEHOLDER_IMAGE_URL, ""]); // Default the ETag returned to the empty string so we know to replace it ASAP.
				}
			})
		});

		request.on('error', error => {
			console.error(`Got error: ${error.message} while fetching image at ${waypointPath}. Using placeholder image.`);
			resolve([CustomizationConstants.PLACEHOLDER_IMAGE_URL, ""]); // Default the ETag returned to the empty string so we know to replace it ASAP.
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName === GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER 
		|| customizationCategoryFolderName === GeneralConstants.SHOP_ROOT_FOLDER
		|| customizationCategoryFolderName === GeneralConstants.ARMOR_ROOT_FOLDER
		|| customizationCategoryFolderName === GeneralConstants.WEAPON_ROOT_FOLDER
		|| customizationCategoryFolderName === GeneralConstants.VEHICLE_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;

			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			iterations = 0;
			while (customizationTypeFileList.length > 0)
			{
				customizationTypeFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				iterations++;
				customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
					{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
			}

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
				iterations = 0;
				while (customizationCoreFileList.length > 0)
				{
					customizationCoreFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }

					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					iterations = 0;
					while (customizationParentTypeFileList.length > 0) {
						customizationParentTypeFileList.forEach((file) => {
							// Even larger line here. :(
							folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
						});

						iterations++;
						customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
							{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
					}
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	/*wixData.query(KeyConstants.KEY_VALUE_DB)
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
		});*/

	// Save the specific categories as well.
	for (let category in folderDict["/"][customizationImageFolderName + "/"]) {
		if (category === GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER + "/"
		|| category === GeneralConstants.SHOP_ROOT_FOLDER + "/"
		|| category === GeneralConstants.ARMOR_ROOT_FOLDER + "/"
		|| category === GeneralConstants.WEAPON_ROOT_FOLDER + "/"
		|| category === GeneralConstants.VEHICLE_ROOT_FOLDER + "/") {
			continue;
		}

		wixData.query(KeyConstants.KEY_VALUE_DB)
			.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + category)
			.find()
			.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				
				let categorySpecificFolderDict = { 
					"/": { 
						[customizationImageFolderName + "/"]: {
							[category]: folderDict["/"][customizationImageFolderName + "/"][category]
						}
					}
				};

				item.value = categorySpecificFolderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				let categorySpecificFolderDict = { 
					"/": { 
						[customizationImageFolderName + "/"]: {
							[category]: folderDict["/"][customizationImageFolderName + "/"][category]
						}
					}
				};

				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + category, "value": categorySpecificFolderDict });
			}
		});
	}
}

export async function generateArmorFolderDict() {
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName != GeneralConstants.ARMOR_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;

			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			iterations = 0;
			while (customizationTypeFileList.length > 0)
			{
				customizationTypeFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				iterations++;
				customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
					{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
			}

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
				iterations = 0;
				while (customizationCoreFileList.length > 0)
				{
					customizationCoreFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }

					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					iterations = 0;
					while (customizationParentTypeFileList.length > 0) {
						customizationParentTypeFileList.forEach((file) => {
							// Even larger line here. :(
							folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
						});

						iterations++;
						customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
							{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
					}
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.ARMOR_ROOT_FOLDER + "/")
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.ARMOR_ROOT_FOLDER + "/", "value": folderDict });
			}
		});
}

export async function generateWeaponFolderDict() {
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName != GeneralConstants.WEAPON_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;

			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			iterations = 0;
			while (customizationTypeFileList.length > 0)
			{
				customizationTypeFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				iterations++;
				customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
					{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
			}

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
				iterations = 0;
				while (customizationCoreFileList.length > 0)
				{
					customizationCoreFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }

					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					iterations = 0;
					while (customizationParentTypeFileList.length > 0) {
						customizationParentTypeFileList.forEach((file) => {
							// Even larger line here. :(
							folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
						});

						iterations++;
						customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
							{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
					}
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.WEAPON_ROOT_FOLDER + "/")
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.WEAPON_ROOT_FOLDER + "/", "value": folderDict });
			}
		});
}

export async function generateVehicleFolderDict() {
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName != GeneralConstants.VEHICLE_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;

			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			iterations = 0;
			while (customizationTypeFileList.length > 0)
			{
				customizationTypeFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				iterations++;
				customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
					{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
			}

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
				iterations = 0;
				while (customizationCoreFileList.length > 0)
				{
					customizationCoreFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }

					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					iterations = 0;
					while (customizationParentTypeFileList.length > 0) {
						customizationParentTypeFileList.forEach((file) => {
							// Even larger line here. :(
							folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
						});

						iterations++;
						customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
							{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
					}
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.VEHICLE_ROOT_FOLDER + "/")
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_" + GeneralConstants.VEHICLE_ROOT_FOLDER + "/", "value": folderDict });
			}
		});
}

// We need to be more efficient, so we're going to generate the entire folder tree all at once, then use the paths in the tree to locate each image.
export async function generateShopFolderDict() {
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName != GeneralConstants.SHOP_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		for (let j = 0; j < customizationCategoryFolderList.length; j++) {
			let typeElement = customizationCategoryFolderList[j];
			folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
			parentFolderId = typeElement.folderId;
			customizationTypeFolderName = typeElement.folderName;

			// Same for the type folders.
			let customizationTypeFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId });
			let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
			iterations = 0;
			while (customizationTypeFileList.length > 0)
			{
				customizationTypeFileList.forEach((file) => {
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
				});

				iterations++;
				customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
					{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
			}

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
				iterations = 0;
				while (customizationCoreFileList.length > 0)
				{
					customizationCoreFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationCoreFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}

				for (let l = 0; l < customizationCoreFolderList.length; l++) {
					let parentTypeElement = customizationCoreFolderList[l];
					// This is actually insane at this point. Beware the giant AF line below!
					folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"] = { "_id": parentTypeElement.folderId }

					let customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentTypeElement.folderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT })
					iterations = 0;
					while (customizationParentTypeFileList.length > 0) {
						customizationParentTypeFileList.forEach((file) => {
							// Even larger line here. :(
							folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][customizationCoreFolderName + "/"][parentTypeElement.folderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
						});

						iterations++;
						customizationParentTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
							{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
					}
				}
			}
		}
	}

	console.log("Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_Shop/")
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY + "_Shop/", "value": folderDict });
			}
		});
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
	parentCustomizationType = null, categorySpecificDictsAndArrays = null, imageETag = null, checkAndReturnETag = false) {
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
				}

				if (folderExists && CustomizationConstants.IS_ATTACHMENTS_ARRAY.includes(customizationCategory)) {
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

	//console.log("Item Directory Path: " + mediaPath);

	let fileSystemSafeTitle = title.replace(/[\\/?:]/g, "_"); // Clean out some of the common illegal characters (\, /, ?, :).
	let filenameType = (customizationCategory == ShopConstants.SHOP_KEY) ? "Bundle" :  // If this is a Shop Bundle, the type in the name is Bundle.
		(customizationType == CustomizationConstants.ITEM_TYPES.core) ? CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreType : // If core, [CoreType].
			customizationType; // Otherwise it is the type provided by the caller.

	let fileKey = fileSystemSafeTitle.replace(/\./g, ",") + " " + filenameType + ",png";

	if (folderExists) {
		//console.log("Directory Path found.");

		if (fileKey in subFolderDict) {
			// We found a matching file, but now we need to confirm that it is up-to-date by checking the ETag.
			let fileData = await mediaManager.getFileInfo(subFolderDict[fileKey]); // We'll either use this or delete it.

			if (!checkAndReturnETag) {
				return fileData.fileUrl;
			}

			let newETag = "";

			let retry = true;
			let retryCount = 0;
			const MAX_RETRIES = 10;
			while (retry && retryCount < MAX_RETRIES) {
				try {
					newETag = await getETag(headers, waypointPath);
					retry = false;
				}
				catch (error) {
					console.error(error + " occurred while fetching ETag for " + waypointPath + "." +
						((retry) ? ("Try " + (++retryCount) + " of " + MAX_RETRIES + "...") : ""));
				}
			}
			if (imageETag == newETag) { // If the ETag provided by the caller matches the one returned in the header of the image, then we just use what we have.
				return [fileData.fileUrl, newETag];
			}
			else {
				// We need to replace the existing image. Let's move the old one to the trash first.
				console.warn("Deleting this file due to out-of-date ETag: ", fileData);
				mediaManager.moveFilesToTrash([fileData.fileUrl]);
			}
		}
		else {
			console.log("File not found for " + fileKey + " in " + mediaPath);
		}
	}
	else {
		// If the directory didn't exist before, we need to make it by adding the image.
		console.log("Directory not found for " + mediaPath + ".");
	}

	let retryCount = 0;
	const MAX_RETRIES = 10;
	while (retryCount < MAX_RETRIES) {
		try {
			let results = await addCustomizationImageToMediaManager(headers, waypointPath, mimeType, mediaPath, fileSystemSafeTitle + " " + filenameType + ".png");
			subFolderDict[fileKey] = results[0]; // Add the image to our in-memory folder dict.
			if (checkAndReturnETag) {
				return results;
			}
			else {// We now return the ETag in [1], so just return [0] (the image URL) for now.
				return results[0];
			}
		}
		catch (error) {
			console.error(error + " occurred while fetching image from " + waypointPath + "." +
				"Try " + (++retryCount) + " of " + MAX_RETRIES + "...");
		}
	}
}

// There will be a ton of Emblem Palette images, so we need to maintain this list separately.
export async function generateEmblemPaletteFolderDict() {
	// The folderDict will essentially be a hierarchical listing of the customization images folders. The ID of each folder is stored in _id, except for "/".
	// We will also store the files in this dictionary with the user-readable filename as the key (with . replaced by , since JSON) and the file Name as the value. 
	// Still need to fetch the file URL, but that should be quick. Speed. I am speed.

	console.log("Starting emblem palette folder dict generation.");
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
	let iterations = 0;
	while (customizationImagesFileList.length > 0) {
		customizationImagesFileList.forEach((file) => {
			folderDict["/"][customizationImageFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
		});

		iterations++;

		customizationImagesFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
			{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
	}

	let customizationCategoryFolderName;

	for (let i = 0; i < customizationImagesFolderList.length; i++) {
		let element = customizationImagesFolderList[i];
		folderDict["/"][customizationImageFolderName + "/"][element.folderName + "/"] = { "_id": element.folderId }
		parentFolderId = element.folderId;
		customizationCategoryFolderName = element.folderName;

		if (customizationCategoryFolderName != GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER) {
			continue;
		}

		// For each of these category folders, we need to get the folders within.
		let customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FOLDERS_LIMIT });
		let customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
		iterations = 0;
		while (customizationCategoryFileList.length > 0)
		{
			customizationCategoryFileList.forEach((file) => {
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
			});

			iterations++;
			customizationCategoryFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
		}

		let customizationTypeFolderName;
		iterations = 0;
		let categoryParentFolderId = parentFolderId;
		while (customizationCategoryFolderList.length > 0)
		{
			for (let j = 0; j < customizationCategoryFolderList.length; j++) {
				let typeElement = customizationCategoryFolderList[j];
				folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][typeElement.folderName + "/"] = { "_id": typeElement.folderId }
				parentFolderId = typeElement.folderId;
				customizationTypeFolderName = typeElement.folderName;

				let customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, { limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT });
				iterations = 0;
				while (customizationTypeFileList.length > 0)
				{
					customizationTypeFileList.forEach((file) => {
						folderDict["/"][customizationImageFolderName + "/"][customizationCategoryFolderName + "/"][customizationTypeFolderName + "/"][file.originalFileName.replace(/\./g, ",")] = file.fileName;
					});

					iterations++;
					customizationTypeFileList = await mediaManager.listFiles({ parentFolderId: parentFolderId }, null, 
						{ limit: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FILES_LIMIT * iterations });
				}
			}

			iterations++;
			customizationCategoryFolderList = await mediaManager.listFolders({ parentFolderId: categoryParentFolderId }, null, 
				{ limit: GeneralConstants.FILE_DICT_RETURNED_FOLDERS_LIMIT, skip: GeneralConstants.FILE_DICT_RETURNED_FOLDERS_LIMIT * iterations });
		}
	}

	console.log("Emblem Palette Folder dict generated: ", folderDict);

	wixData.query(KeyConstants.KEY_VALUE_DB)
		.eq("key", KeyConstants.KEY_VALUE_EMBLEM_PALETTE_FOLDERS_KEY)
		.find()
		.then((results) => {
			if (results.items.length > 0) {
				let item = results.items[0];
				item.value = folderDict;
				wixData.save(KeyConstants.KEY_VALUE_DB, item);
			}
			else {
				wixData.save(KeyConstants.KEY_VALUE_DB, { "key": KeyConstants.KEY_VALUE_EMBLEM_PALETTE_FOLDERS_KEY, "value": folderDict });
			}
		})
		.catch(error => {
			console.error(error + " occurred while saving Emblem Palette Folder Dict.");
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
export async function getEmblemPaletteImageUrl(folderDict, headers, paletteConfigurationId, nameplateWaypointId, type, waypointPath, eTag, mimeType) {
	// The file path has the form 
	// /Customization Images/Emblem Palettes/[paletteConfigurationId]/[nameplateWaypointId] [type].png
	// [type] is either "Nameplate" or "Emblem".

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
	if (folderExists && ((GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER + "/") in subFolderDict)) {
		subFolderDict = subFolderDict[GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER + "/"];
	}
	else {
		folderExists = false;
	}

	//console.log(subFolderDict);

	let mediaPath = "/" + GeneralConstants.CUSTOMIZATION_ROOT_FOLDER + "/" + GeneralConstants.EMBLEM_PALETTE_ROOT_FOLDER + "/" + paletteConfigurationId + "/";
	if (folderExists && ((paletteConfigurationId + "/") in subFolderDict)) {
		subFolderDict = subFolderDict[paletteConfigurationId + "/"];
	}
	else {
		folderExists = false;
	}

	let fileSystemSafeTitle = nameplateWaypointId.replace(/[\\/?:]/g, "_"); // Clean out some of the common illegal characters (\, /, ?, :). There likely won't be any, but best to be safe.

	if (folderExists) {

		let fileKey = fileSystemSafeTitle.replace(/\./g, ",") + " " + type + ",png";

		if (fileKey in subFolderDict) {
			// We found a matching file, but now we need to confirm that it is up-to-date by checking the ETag.
			try {
				let fileData = {};

				let newETag = "";

				let retry = true;
				let retryCount = 0;
				const MAX_RETRIES = 10;
				while (retry && retryCount < MAX_RETRIES) {
					try {
						fileData = await mediaManager.getFileInfo(subFolderDict[fileKey]); // We'll either use this or delete it.

						newETag = await getETag(headers, waypointPath, ApiConstants.WAYPOINT_URL_BASE_WAYPOINT);
						retry = false;
					}
					catch (error) {
						console.error(error + " occurred while fetching file info or ETag for " + waypointPath + "." +
							((retry) ? ("Try " + (++retryCount) + " of " + MAX_RETRIES + "...") : ""));
					}
				}
				if (eTag == newETag && "fileUrl" in fileData) { // If the ETag provided by the caller matches the one returned in the header of the image, then we just use what we have.
					return [fileData.fileUrl, newETag]; // The existing ETag is still valid, so we send it back.
				}
				else {
					// We need to replace the existing image. Let's move the old one to the trash first.
					console.warn("Deleting this file due to out-of-date ETag: ", fileData);
					mediaManager.moveFilesToTrash([fileData.fileUrl]);
				}
			}
			catch (error) {
				console.error(error + " occurred while checking existing file with key " + fileKey + ". Assuming it does not exist.");
			}
			

			
		}
		else {
			console.log("File not found for " + fileKey + " in " + mediaPath);
		}
	}
	else {
		// If the directory didn't exist before, we need to make it by adding the image.
		console.log("Directory not found for " + mediaPath + ".");
	}

	let retryCount = 0;
	const MAX_RETRIES = 10;
	while (retryCount < MAX_RETRIES) {
		try {
			return await addCustomizationImageToMediaManager(headers, waypointPath, mimeType, mediaPath, fileSystemSafeTitle + " " + type + ".png", ApiConstants.WAYPOINT_URL_BASE_WAYPOINT);
		}
		catch (error) {
			console.error(error + " occurred while fetching image from " + waypointPath + "." +
				"Try " + (++retryCount) + " of " + MAX_RETRIES + "...");
		}
	}
	
}
