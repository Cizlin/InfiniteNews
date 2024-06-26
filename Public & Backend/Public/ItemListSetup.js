// Filename: public/ItemListSetup.js
// This file contains the code necessary to setup and update the Item List pages, including their filters.

import { session } from 'wix-storage';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { setPaginationIndexFromSave } from 'public/Pagination.js';

import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';
import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

import * as KeyConstants from 'public/Constants/KeyConstants.js';

import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';

//#region Initializing all filter objects.
let filter = wixData.filter(); // The filter for the dataset content displayed. The value will be established based on URL parameters. DO NOT CHANGE AFTER THIS!!!
let searchFilter = wixData.filter(); // The filter for the dataset content displayed, plus the search in the name.
let optionalFilter = wixData.filter(); // The filter including the current dropdown selections.
//#endregion

//#region Fields to use in the filters. The defaults are almost always right, but can be changed.
let nameField = "itemName";								// Should always be itemName except for Passes, which use title.
let qualityReferenceField = "qualityReference";			// Should always be qualityReference.
let currentlyAvailableField = "currentlyAvailable";		// Should always be currentlyAvailable.
let hiddenField = "hidden";								// Should always be hidden.
let releaseReferenceField = "releaseReference";			// Should always be releaseReference.
let sourceTypeReferenceField = "sourceTypeReference";	// Should always be sourceTypeReference.
//#endregion

// This function is used to collapse the Filter menu.
function collapseFilterMenu () {
	$w("#filterButton").disable();
	$w("#filterButtonClose").disable();
	let rollOptions = {
		"duration": 250,
		"direction": "top"
	};

	$w("#box1").hide("roll", rollOptions)
	//$w("#box1").collapse()
	.then(function () {
		$w("#box1").collapse()
		.then(function() {
			$w("#filterButton").show();
			$w("#filterButtonClose").hide();
			$w("#filterButton").enable();
			$w("#filterButtonClose").enable();
		});
	});
}

// This function is used to expand the Filter menu.
function expandFilterMenu() {
	$w("#filterButton").disable();
	$w("#filterButtonClose").disable();
	let rollOptions = {
		"duration": 250,
		"direction": "top"
	};

	$w("#box1").expand()
	.then(function() {
		$w("#box1").show("roll", rollOptions)
		.then(function() {
			$w("#filterButtonClose").show();
			$w("#filterButton").hide();
			$w("#filterButton").enable();
			$w("#filterButtonClose").enable();
		});
	});
}

async function setSort() {
	let sortSelection = $w("#sortDropdown").value;
	session.setItem(KeyConstants.SORT_KEY, sortSelection);
	switch (sortSelection) {
		case "MostRecentlyAdded":
			await $w("#dynamicDataset").setSort(wixData.sort().descending("_createdDate").ascending(nameField));
			break;
		case "MostRecentlyUpdated":
			await $w("#dynamicDataset").setSort(wixData.sort().descending("_updatedDate").ascending(nameField));
			break;
		default:
			await $w("#dynamicDataset").setSort(wixData.sort().ascending(nameField));

	}
}

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFilters(setPaginationFromSave = false) {
	optionalFilter = filter;

	// First we add the Quality filter.
	let qualityDropdownSelection = $w("#qualityDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.QUALITY_KEY, qualityDropdownSelection);

	switch(qualityDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query(CustomizationConstants.QUALITY_DB)
				.eq(CustomizationConstants.QUALITY_FIELD, qualityDropdownSelection)
				.find()
				.then( (results) => {
					//console.log(results);
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq(qualityReferenceField, selectedKey);
					}
				});
			break;
	}

	// Next, we add the Available Filter.
	let availableDropdownSelection = $w("#availableDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.AVAILABLE_KEY, availableDropdownSelection);

	switch(availableDropdownSelection) {
		case "Yes":
			optionalFilter = optionalFilter.eq(currentlyAvailableField, true);
			break;
		case "No":
			optionalFilter = optionalFilter.ne(currentlyAvailableField, true);
			break;
		default:
			break;
	}

	// Now, we want the Hidden Filter.
	// Next, we add the Available Filter.
	let hiddenDropdownSelection = $w("#hiddenDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.HIDDEN_KEY, hiddenDropdownSelection);

	switch(hiddenDropdownSelection) {
		case "Hidden Only":
			optionalFilter = optionalFilter.eq(hiddenField, true);
			break;
		case "No Hidden":
			optionalFilter = optionalFilter.ne(hiddenField, true);
			break;
		default:
			break;
	}

	// Finally, we add the Release filter.
	let releaseDropdownSelection = $w("#releaseDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.RELEASE_KEY, releaseDropdownSelection);

	switch(releaseDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query(CustomizationConstants.RELEASE_DB)
				.eq(CustomizationConstants.RELEASE_FIELD, releaseDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// filter
						optionalFilter = optionalFilter.eq(releaseReferenceField, selectedKey);
							
					}
				});	
			break;
	}

	// Finally, we add the Source Filter. This must be at the end since we have an or relationship dependent on all previous filters already being added.
	// First, we gather all the IDs of the sources we are looking for into an array.
	// Then, we use the .hasSome("sourceTypeReference", [{array}]) function to add to the optional filter.

	let sourceIDArray = ["N/A"]; // The array that will store our source IDs. We use a default value of "N/A" to ensure nothing is returned when nothing is selected.
	let fullSourceIdArray = [];
	let pendingSelected = false; // If the (Pending) option is selected, we also want it to match items with an empty sourcetype field.

	// Fill the array with the relevant IDs
	$w("#sourceRepeater").forEachItem( ($item, itemData, index) => {
		let isChecked = $item("#sourceCheckbox").checked;
		let id = itemData._id;
		let name = itemData[CustomizationConstants.SOURCE_TYPE_NAME_FIELD];

		session.setItem(name, String(isChecked));

		if (isChecked) {
			sourceIDArray.push(id);
			if (name == CustomizationConstants.SOURCE_TYPE_PENDING) {
				pendingSelected = true;
			}
		}

		fullSourceIdArray.push(id);
	});

	// Match items based on the array contents if the array and item source reference match at least in one case.
	console.log("The array of source IDs to search for: " + String(sourceIDArray));
	if (!pendingSelected) {
		optionalFilter = optionalFilter.hasSome(sourceTypeReferenceField, sourceIDArray);
	}
	else {
		let tempFilter = optionalFilter;
		optionalFilter = optionalFilter.hasSome(sourceTypeReferenceField, sourceIDArray); // Filter for items matching selected sourcetypes.

		// Include items that have no sourceType since we selected (Pending).
		optionalFilter = optionalFilter.or(tempFilter.not(wixData.filter().hasSome(sourceTypeReferenceField, fullSourceIdArray)));
	}

	console.log("Search filter while in optional filter: ", JSON.stringify(searchFilter));

	let finalFilter = optionalFilter.and(searchFilter.isNotEmpty(nameField));

	await $w("#dynamicDataset").setFilter(finalFilter)
		.then(function() {
			console.log("Filter applied ", JSON.stringify(finalFilter));
			if (!setPaginationFromSave) {
				console.log("Resetting pagination to 1 after optional filter.");
				$w("#pagination1").currentPage = 1;
				$w("#dynamicDataset").loadPage(1);
			}
			else {
				console.log("Setting Pagination Index after initial optional filter.");
				setPaginationIndexFromSave();
				console.log("Pagination Index Set after initial optional filter.");
			}
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFiltersShop(setPaginationFromSave = false) {
	optionalFilter = filter;

	// First we add the Quality filter.
	let qualityDropdownSelection = $w("#qualityDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.QUALITY_KEY, qualityDropdownSelection);

	switch(qualityDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query(CustomizationConstants.QUALITY_DB)
				.eq(CustomizationConstants.QUALITY_FIELD, qualityDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq(qualityReferenceField, selectedKey);
						//console.log(optionalFilter);
					}
				});
			break;
	}

	// Next, we add the Available Filter.
	let availableDropdownSelection = $w("#availableDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.AVAILABLE_KEY, availableDropdownSelection);

	switch(availableDropdownSelection) {
		case "Yes":
			optionalFilter = optionalFilter.eq(currentlyAvailableField, true).or(optionalFilter.eq(ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD, true));
			break;
		case "ShopOnly":
			optionalFilter = optionalFilter.eq(currentlyAvailableField, true).ne(ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD, true);
			break;
		case "CustomizationOnly":
			optionalFilter = optionalFilter.ne(currentlyAvailableField, true).eq(ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD, true);
			break;
		case "No":
			optionalFilter = optionalFilter.ne(currentlyAvailableField, true).ne(ShopConstants.SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD, true);
			break;
		default:
			break;
	}

	// Now, we need to add the Timeframe Filter.
	let timeframeDropdownSelection = $w("#timeframeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.TIMEFRAME_KEY, timeframeDropdownSelection);

	switch(timeframeDropdownSelection) {
		case "Any":
			break;
		default:
			optionalFilter = optionalFilter.contains(ShopConstants.SHOP_TIME_TYPE_FIELD, timeframeDropdownSelection);
	}

	// Next, add the Cost filter.
	let costDropdownSelection = $w("#costDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.COST_KEY, costDropdownSelection);

	// We only want to add the filter if it's valid.
	if(Number.isInteger(parseInt(costDropdownSelection))) {
		optionalFilter = optionalFilter.eq(ShopConstants.SHOP_COST_CREDITS_FIELD, parseInt(costDropdownSelection));
	}

	// Finally, we add the Shop Type filter.
	let shopTypeDropdownSelection = $w("#shopTypeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.SHOP_TYPE_KEY, shopTypeDropdownSelection);

	switch(shopTypeDropdownSelection) {
		case "HCS":
			optionalFilter = optionalFilter.eq(ShopConstants.SHOP_IS_HCS_FIELD, true);
			break;
		case "Normal":
			optionalFilter = optionalFilter.eq(ShopConstants.SHOP_IS_HCS_FIELD, false);
			break;
		default:
			break;
	}

	console.log("After all optional filtering.");
	console.log(optionalFilter);

	// Append the searchFilter contents to the optionalFilter.
	console.log("After name filtering is added.");
	console.log(optionalFilter.and(searchFilter.isNotEmpty(nameField)));

	let finalFilter = optionalFilter.and(searchFilter.isNotEmpty(nameField));

	await $w("#dynamicDataset").setFilter(finalFilter)
		.then(function() {
			console.log("Filter applied ", JSON.stringify(finalFilter));
			if (!setPaginationFromSave) {
				console.log("Resetting pagination to 1 after optional filter.");
				$w("#pagination1").currentPage = 1;
				$w("#dynamicDataset").loadPage(1);
			}
			else {
				console.log("Setting Pagination Index after initial optional filter.");
				setPaginationIndexFromSave();
				console.log("Pagination Index Set after initial optional filter.");
			}

			//updateSort();
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFiltersPasses(setPaginationFromSave = false) {
	optionalFilter = filter;

	// First we add the Release filter.
	let releaseDropdownSelection = $w("#releaseDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.RELEASE_KEY, releaseDropdownSelection);

	switch(releaseDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query(CustomizationConstants.RELEASE_DB)
				.eq(CustomizationConstants.RELEASE_FIELD, releaseDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq(PassConstants.PASS_SEASON_FIELD, selectedKey);
						console.log(optionalFilter);
					}
				});
			break;
	}	

	// Finally, we add the Pass Type filter.
	let passTypeDropdownSelection = $w("#passTypeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.PASS_TYPE_KEY, passTypeDropdownSelection);

	switch(passTypeDropdownSelection) {
		case "Event":
			optionalFilter = optionalFilter.eq(PassConstants.PASS_IS_EVENT_FIELD, true);
			break;
		case "Battle":
			optionalFilter = optionalFilter.eq(PassConstants.PASS_IS_EVENT_FIELD, false);
			break;
		default:
			break;
	}

	console.log("After all optional filtering.");
	console.log(optionalFilter);

	// Append the searchFilter contents to the optionalFilter.
	console.log("After name filtering is added.");
	console.log(optionalFilter.and(searchFilter.isNotEmpty(nameField)));

	let finalFilter = optionalFilter.and(searchFilter.isNotEmpty(nameField));

	await $w("#dynamicDataset").setFilter(finalFilter)
		.then(function() {
			console.log("Filter applied ", JSON.stringify(finalFilter));
			if (!setPaginationFromSave) {
				console.log("Resetting pagination to 1 after optional filter.");
				$w("#pagination1").currentPage = 1;
				$w("#dynamicDataset").loadPage(1);
			}
			else {
				console.log("Setting Pagination Index after initial optional filter.");
				setPaginationIndexFromSave();
				console.log("Pagination Index Set after initial optional filter.");
			}
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

// This function is used to set the optional filters for Twitch Drops
async function setOptionalFiltersTwitchDrops(setPaginationFromSave = false) {
	optionalFilter = filter;

	// First we add the Reward filter.
	let rewardDropdownSelection = $w("#rewardDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.REWARD_KEY, rewardDropdownSelection);

	switch(rewardDropdownSelection) {
		case "RESET_ALL":
			break;
		default:
			await wixData.query("TwitchDropRewards")
				.contains("notificationText", rewardDropdownSelection)
				.find()
				.then((results) => {

					if (results.items.length === 0) {
						throw "Error retrieving matching Twitch Drop Rewards for notification text " + rewardDropdownSelection;
					}
					let idArray = [];
					for (let i = 0; i < results.items.length; ++i) {
						idArray.push(results.items[i]._id);
					}

					optionalFilter = optionalFilter.hasSome("rewardReferences", idArray);
				})
				.catch ((error) => {
					console.error("Error occurred while trying to filter by Twitch Drop Reward: " + rewardDropdownSelection, error);
				});
			break;
	}

	// Next, we add the Status filter.
	let statusDropdownSelection = $w("#statusDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.STATUS_KEY, statusDropdownSelection);

	switch(statusDropdownSelection) {
		case "RESET_ALL":
			break;
		default:
			optionalFilter = optionalFilter.eq("status", statusDropdownSelection);
			break;
	}

	// Finally, we add the Time filter.
	let filterByDropdownSelection = $w("#timeFilterByDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.TIME_FILTER_BY_KEY, filterByDropdownSelection);

	let fromTimeSelection = $w("#startDatePicker").value;
	$w("#endDatePicker").minDate = $w("#startDatePicker").value; // Ensure the To: date can't be before the From: date.
	session.setItem(KeyConstants.TIME_FROM_KEY, fromTimeSelection.toISOString());

	let toTimeSelection = $w("#endDatePicker").value;
	$w("#startDatePicker").maxDate = $w("#endDatePicker").value; // Ensure the From: date can't be after the To: date.
	session.setItem(KeyConstants.TIME_TO_KEY, toTimeSelection.toISOString());

	switch(filterByDropdownSelection) {
		case "StartDate":
			$w("#startDatePicker").enable();
			$w("#endDatePicker").enable();
			optionalFilter = optionalFilter.ge("campaignStart", fromTimeSelection).le("campaignStart", toTimeSelection);
			break;
		case "EndDate":
			$w("#startDatePicker").enable();
			$w("#endDatePicker").enable();
			optionalFilter = optionalFilter.ge("campaignEnd", fromTimeSelection).le("campaignEnd", toTimeSelection);
			break;
		default:
			// Disable the date pickers while we aren't using them to filter.
			$w("#endDatePicker").disable();
			$w("#startDatePicker").disable();
			break;
	}

	console.log("After all optional filtering.");
	console.log(optionalFilter);

	// Append the searchFilter contents to the optionalFilter.
	console.log("After name filtering is added.");
	console.log(optionalFilter.and(searchFilter.isNotEmpty(nameField)));

	let finalFilter = optionalFilter.and(searchFilter.isNotEmpty(nameField));

	await $w("#dynamicDataset").setFilter(finalFilter)
		.then(function() {
			console.log("Filter applied ", JSON.stringify(finalFilter));
			if (!setPaginationFromSave) {
				console.log("Resetting pagination to 1 after optional filter.");
				$w("#pagination1").currentPage = 1;
				$w("#dynamicDataset").loadPage(1);
			}
			else {
				console.log("Setting Pagination Index after initial optional filter.");
				setPaginationIndexFromSave();
				console.log("Pagination Index Set after initial optional filter.");
			}
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

//#region Creating debounce timer and implementing search filter.
let debounceTimer; // If the debounceTimer is set when we update the text input, it restarts the wait time.
// This lets us wait for a few ms before filtering upon text input change, implementing effective debounce.

// Filter by search criteria.
// If setPaginationFromSave is true, then we need to set the Pagination index from the save.
function filterBySearch (setPaginationFromSave = false) {
	if (debounceTimer) {
      	clearTimeout(debounceTimer);
      	debounceTimer = undefined;
   	}
   	debounceTimer = setTimeout(async () => {
      	//console.log($w("#nameSearch").value);
		let searchFilterApplied = optionalFilter; // The filter for the dataset content displayed.

		// Define the filter. We use a second filter to store just the search part.
		console.log("Performing name search on " + $w("#nameSearch").value);
		searchFilter = filter.contains(nameField, $w("#nameSearch").value);
		searchFilterApplied = optionalFilter.contains(nameField, $w("#nameSearch").value);

		session.setItem(KeyConstants.QUICK_SEARCH_KEY, $w("#nameSearch").value);

		console.log(searchFilterApplied);
		
		let finalFilter = searchFilterApplied;

		$w("#dynamicDataset").setFilter(finalFilter)
			.then(function() {
				console.log("Filter applied ", JSON.stringify(finalFilter));
				if (!setPaginationFromSave) {
					console.log("Resetting pagination to 1 after search filter.");
					$w("#pagination1").currentPage = 1;
					$w("#dynamicDataset").loadPage(1);
				}
				else {
					console.log("Setting Pagination Index after inital name filter.");
					setPaginationIndexFromSave();
					console.log("Pagination Index Set after initial name filter.");
				}

				/*if (globalCustomizationCategory == ShopConstants.SHOP_KEY) {
					updateSort();
				}*/
			})
			.catch( (err) => {
				console.error(err);
			});
		
   	}, 250); // 250 milliseconds works for me, your mileage may vary
}
//#endregion

//#region Shop Sort code
// Update the user-selected sort.
function updateSort() {
	let dropdownValue = $w("#sortDropdown").value;
	let sortOrder = $w("#sortOrderDropdown").value;
	let sort = wixData.sort();

	if (dropdownValue == "Name") {
		// Show the order selector.
		$w("#sortOrderDropdown").show();
		$w("#SortOrderTitle").show();

		// Implement a name sort.
		if (sortOrder == "Ascending") {
			sort = sort.ascending(ShopConstants.SHOP_ITEM_NAME_FIELD);
		}
		else if (sortOrder == "Descending") {
			sort = sort.descending(ShopConstants.SHOP_ITEM_NAME_FIELD);
		}
	}
	else if (dropdownValue == "Cost") {
		// Show the order selector.
		$w("#sortOrderDropdown").show();
		$w("#SortOrderTitle").show();

		// Sort by cost, then by name.
		if (sortOrder == "Ascending") {
			sort = sort.ascending(ShopConstants.SHOP_COST_CREDITS_FIELD);
			sort = sort.ascending(ShopConstants.SHOP_ITEM_NAME_FIELD);
		}
		else if (sortOrder == "Descending") {
			sort = sort.descending(ShopConstants.SHOP_COST_CREDITS_FIELD);
			sort = sort.descending(ShopConstants.SHOP_ITEM_NAME_FIELD);
		}
	}
	else {
		// This order is super custom, so it doesn't make sense to keep the order selector visible.
		$w("#sortOrderDropdown").hide();
		$w("#SortOrderTitle").hide();

		// Sort in the following order:
		// Currently Available: Descending
		// IsHcs: Ascending
		// Cost: Descending
		// Name: Ascending
		sort = sort
			.descending(ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD)
			.ascending(ShopConstants.SHOP_IS_HCS_FIELD)
			.descending(ShopConstants.SHOP_COST_CREDITS_FIELD)
			.ascending(ShopConstants.SHOP_ITEM_NAME_FIELD);
	}

	console.log("Sorting as follows:", sort);
	$w("#dynamicDataset").setSort(sort);
}
//#endregion

export async function initialItemListSetup(customizationCategory) {
	// We want to update the name search text ASAP.
	let savedQuickSearchText = session.getItem(KeyConstants.QUICK_SEARCH_KEY);
	if (savedQuickSearchText)
	{
		$w("#nameSearch").value = savedQuickSearchText;
	}
	
	$w("#nameSearch").readOnly = false;

    //#region Setting up Filter menu buttons and collapsing the menu.
	// Set up the Filter menu by setting the closeButton to collapse the Filter menu and collapsing the menu.
	if (customizationCategory != CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY) { // We don't have any Challenge filters for now.
		$w("#closeButton").onClick(collapseFilterMenu);
		$w("#filterButton").onClick(expandFilterMenu);
		$w("#filterButtonClose").onClick(collapseFilterMenu);
		collapseFilterMenu();
	}
    //#endregion

	if (customizationCategory == ShopConstants.SHOP_KEY) {
		// Hide the sort order dropdown and title by default. They will be revealed if the user changes their sort settings.
		$w("#sortOrderDropdown").hide();
		$w("#SortOrderTitle").hide();
	}

	switch (customizationCategory) {
		case ArmorConstants.ARMOR_KEY:
		case ArmorConstants.ARMOR_ATTACHMENT_KEY:
		case WeaponConstants.WEAPON_KEY:
		case VehicleConstants.VEHICLE_KEY:
		case BodyAndAiConstants.BODY_AND_AI_KEY:
		case SpartanIdConstants.SPARTAN_ID_KEY:
			nameField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationNameField;
			qualityReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationQualityReferenceField;
			currentlyAvailableField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCurrentlyAvailableField;
			hiddenField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationHiddenField;
			releaseReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationReleaseReferenceField;
			sourceTypeReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSourceTypeField;
			break;

		case ConsumablesConstants.CONSUMABLES_KEY:
			nameField = ConsumablesConstants.CONSUMABLES_NAME_FIELD;
			qualityReferenceField = ConsumablesConstants.CONSUMABLES_QUALITY_REFERENCE_FIELD;
			currentlyAvailableField = ConsumablesConstants.CONSUMABLES_CURRENTLY_AVAILABLE_FIELD;
			hiddenField = ConsumablesConstants.CONSUMABLES_HIDDEN_FIELD;
			releaseReferenceField = ConsumablesConstants.CONSUMABLES_RELEASE_REFERENCE_FIELD;
			sourceTypeReferenceField = ConsumablesConstants.CONSUMABLES_SOURCE_TYPE_REFERENCE_FIELD;
			break;

		case ShopConstants.SHOP_KEY:
			// We only need to set name, qualityReference, and currentlyAvailable fields.
			nameField = ShopConstants.SHOP_ITEM_NAME_FIELD;
			qualityReferenceField = ShopConstants.SHOP_QUALITY_REFERENCE_FIELD;
			currentlyAvailableField = ShopConstants.SHOP_CURRENTLY_AVAILABLE_FIELD;
			break;

		case PassConstants.PASS_KEY:
			// We only need to set the name field.
			nameField = PassConstants.PASS_TITLE_FIELD;
			break;

		case KeyConstants.TWITCH_DROPS_KEY:
			nameField = "campaignName";
			break;

		case CapstoneChallengeConstants.CAPSTONE_CHALLENGE_KEY:
			// We only need to set the name field.
			nameField = CapstoneChallengeConstants.CAPSTONE_CHALLENGE_NAME_FIELD;
    }

    //#region Checking to see if Core/socket filtering is necessary (i.e. we are working with Armor, Weapons, or Vehicles).
	let filterByCore = (customizationCategory in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT); // By default, we don't need to do core filtering
	let filterBySocket = CustomizationConstants.IS_CUSTOMIZATION_ARRAY.includes(customizationCategory);
	// We almost always want to filter by socket, but we don't for Consumables and non-customization items.

    //#endregion
	
	$w("#dynamicDataset").onReady(async () => {
		if (filterByCore || filterBySocket) {
			//#region Creating and initializing variables based on customizationSection. Contains return statement.
			let query = wixLocation.query; // Needed to get URL parameters.

			let coreID = null; // The Core ID
			let coreName = null; // The name of the selected Core (or All * Cores if not found.)
			let coreDB = null; // The name of the Core database.
			let coreReferenceField = null; // The name of the Core Multireference Field in the Customization database.
			let anyCoreID = null; // The ID of the "Any" Core.
			let coreNameField = null;

			let socketID = null; // The socket ID
			let socketName = null; // The name of the selected socket (or All * Sockets if not found.)
			let socketDB = null; // The name of the socket database.
			let socketReferenceField = null; // The name of the socket Multireference Field in the Customization database.
			let socketNamefield = null;

			let tempCoreID; // We want to use a temporary Core ID since we are checking to see if the URL param is undefined.
			let tempSocketID; // We want to use a temporary socket ID for a similar reason.

			// Initialize the variables with the appropriate values.
			switch (customizationCategory) {
				case ArmorConstants.ARMOR_KEY:
				case WeaponConstants.WEAPON_KEY:
				case VehicleConstants.VEHICLE_KEY:
					tempCoreID = query[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlCoreParam];
					coreName = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].DefaultCoreName;
					coreDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreDb;
					coreReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationCoreReferenceField;
					anyCoreID = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].AnyCoreId;
					coreNameField = CustomizationConstants.CORE_CATEGORY_SPECIFIC_VARS[customizationCategory].CoreNameField;

				case ArmorConstants.ARMOR_ATTACHMENT_KEY:
				case BodyAndAiConstants.BODY_AND_AI_KEY:
				case SpartanIdConstants.SPARTAN_ID_KEY:
					tempSocketID = query[CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].UrlSocketParam];
					socketName = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].DefaultSocketName;
					socketDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketDb;
					socketReferenceField = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationSocketReferenceField;
					socketNamefield = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].SocketNameField;
					break; 

				default:
					console.error("initialItemListSetup: Failed to find matching customization section. Was given " + customizationCategory);
					return -1;
			}
			//#endregion

			if (CustomizationConstants.HAS_KITS_ARRAY.includes(customizationCategory)) {
				const IS_KIT_ITEM_ONLY_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationIsKitItemOnlyField;
				filter = filter.not(filter.eq(IS_KIT_ITEM_ONLY_FIELD, true)); // Hide items we don't want to include in the general list (Kit-exclusive items).
			}

			//#region Setting URL filters
			// Set the filter based on the content we have been provided in the URL. No filter if no parameters provided in URL.
			if (tempCoreID && tempSocketID) { // Checking nulls lets us more easily see if this variables have values.
				// The Core and socket were provided in the URL parameters.
				coreID = tempCoreID;
				socketID = tempSocketID;

				filter = filter.hasSome(coreReferenceField, [coreID, anyCoreID])
					.and(filter.eq(socketReferenceField, socketID));
			}
			else if (tempCoreID) {
				// Only the Core was provided in the URL parameters.
				coreID = tempCoreID;
				
				filter = filter.hasSome(coreReferenceField, [coreID, anyCoreID]);
			}
			else if (tempSocketID) {
				// Only the socket was provided in the URL parameters.
				socketID = tempSocketID;
				filter = filter.eq(socketReferenceField, socketID);
			}
			//#endregion
		
			//#region Initializing search and optional filters.
			// Initialize the search and optional filters.
			searchFilter = filter;
			optionalFilter = filter;
			//#endregion

			//#region Update the Core text field.
			if (filterByCore) {
				wixData.query(coreDB)
					.eq("_id", coreID)
					.find()
					.then( (results) => {
						//console.log(results);
						if(results.items.length > 0) {
							let firstItem = results.items[0]; // The matching item
							coreName = firstItem[coreNameField];
						}

						$w("#coreText").text = coreName; // The name of the matching item
					});
			}
			//#endregion

			//#region Update the socket text field.
			wixData.query(socketDB)
				.eq("_id", socketID)
				.find()
				.then( (results) => {
					//console.log(results);
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						socketName = firstItem[socketNamefield]; // The name of the matching item
					}

					$w("#socketText").text = socketName;	
				});
			//#endregion
		}

		//#region Setting quick search auto-update behavior
		$w("#nameSearch").onKeyPress(filterBySearch);
		//#endregion

		//#region Setting user's saved filter values.
		// If we have saved configurations for the filters, set them now.
		if (CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(customizationCategory)) {
			let savedQualityValue = session.getItem(KeyConstants.QUALITY_KEY);
			let savedHiddenValue = session.getItem(KeyConstants.HIDDEN_KEY);
			let savedAvailableValue = session.getItem(KeyConstants.AVAILABLE_KEY);
			let savedReleaseValue = session.getItem(KeyConstants.RELEASE_KEY);
			let savedSortValue = session.getItem(KeyConstants.SORT_KEY);

			$w("#qualityDataset").onReady(function () {
				$w("#releaseDataset").onReady(function () {
					$w("#sourcesDataset").onReady(async function() {
						if (savedQualityValue)
						{
							console.log("Found saved Quality value: " + savedQualityValue);
							$w("#qualityDropdown").value = savedQualityValue;
						}
						if (savedHiddenValue)
						{
							console.log("Found saved Hidden value: " + savedHiddenValue);
							$w("#hiddenDropdown").value = savedHiddenValue;
						}
						if (savedAvailableValue)
						{
							console.log("Found saved Available value: " + savedAvailableValue);
							$w("#availableDropdown").value = savedAvailableValue;
						}
						if (savedReleaseValue)
						{
							console.log("Found saved Release value: " + savedReleaseValue);
							$w("#releaseDropdown").value = savedReleaseValue;
						}
						if (savedSortValue)
						{
							console.log("Found saved Sort value: " + savedSortValue);
							$w("#sortDropdown").value = savedSortValue;
						}

						// Set up the initial checkbox states.
						$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
							let name = itemData[CustomizationConstants.SOURCE_TYPE_NAME_FIELD];
							let isChecked = session.getItem(name);
							if (isChecked == "true") {
								$item("#sourceCheckbox").checked = true;
							}
							else if (isChecked == "false") {
								$item("#sourceCheckbox").checked = false;
							}

							//$item("#sourceCheckbox").onChange(setOptionalFilters);
							$item("#checkBoxButton").onClick(function() {
								$item("#sourceCheckbox").checked = !$item("#sourceCheckbox").checked;
								setOptionalFilters();
							})
						});

						await setOptionalFilters(true);

						filterBySearch(true);

						// If the Quality filter is set.
						$w("#qualityDropdown").onChange(setOptionalFilters);

						// If the Hidden filter is set.
						$w("#hiddenDropdown").onChange(setOptionalFilters);

						// If the Available filter is set.
						$w("#availableDropdown").onChange(setOptionalFilters);

						// If the Release filter is set.
						$w("#releaseDropdown").onChange(setOptionalFilters);

						// If the Sort By selection is changed.
						$w("#sortDropdown").onChange(setSort);

						// If the Select All button is set, we set all checkboxes to true and then retrigger optional filters.
						$w("#selectAllButton").onClick(function() {
							$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
								$item("#sourceCheckbox").checked = true;
								session.setItem(itemData[CustomizationConstants.SOURCE_TYPE_NAME_FIELD], String($item("#sourceCheckbox").checked));
							});

							setOptionalFilters();
						});

						// If the Deselect All button is clicked, we set all checkboxes to false and then retrigger optional filters.
						$w("#deselectAllButton").onClick(function() {
							$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
								$item("#sourceCheckbox").checked = false;
								session.setItem(itemData[CustomizationConstants.SOURCE_TYPE_NAME_FIELD], String($item("#sourceCheckbox").checked));
							});

							setOptionalFilters();
						});
					});
				});
			});
		}
		else if (customizationCategory == ShopConstants.SHOP_KEY) {
			// This setup is for the Shop only.
			let savedQualityValue = session.getItem(KeyConstants.QUALITY_KEY);
			let savedTimeframeValue = session.getItem(KeyConstants.TIMEFRAME_KEY);
			let savedAvailableValue = session.getItem(KeyConstants.AVAILABLE_KEY);
			let savedShopTypeValue = session.getItem(KeyConstants.SHOP_TYPE_KEY);
			let savedCostValue = session.getItem(KeyConstants.COST_KEY);

			$w("#qualityDataset").onReady(async function () {
				if (savedQualityValue)
				{
					console.log("Found saved Quality value: " + savedQualityValue);
					$w("#qualityDropdown").value = savedQualityValue;
				}
				if (savedTimeframeValue)
				{
					console.log("Found saved Timeframe value: " + savedTimeframeValue);
					$w("#timeframeDropdown").value = savedTimeframeValue;
				}
				if (savedAvailableValue)
				{
					console.log("Found saved Available value: " + savedAvailableValue);
					$w("#availableDropdown").value = savedAvailableValue;
				}
				if (savedShopTypeValue)
				{
					console.log("Found saved Shop Type value: " + savedShopTypeValue);
					$w("#shopTypeDropdown").value = savedShopTypeValue;
				}
				if (savedCostValue) 
				{
					console.log("Found saved Cost value: " + savedCostValue);
					$w("#costDropdown").value = savedCostValue;
				}

				await setOptionalFiltersShop(true);

				filterBySearch(true);

				// If the Quality filter is set.
				$w("#qualityDropdown").onChange(setOptionalFiltersShop);

				// If the Timeframe filter is set.
				$w("#timeframeDropdown").onChange(setOptionalFiltersShop);

				// If the Available filter is set.
				$w("#availableDropdown").onChange(setOptionalFiltersShop);

				// If the Shop Type filter is set.
				$w("#shopTypeDropdown").onChange(setOptionalFiltersShop);

				// If the Cost filter is set.
				$w("#costDropdown").onChange(setOptionalFiltersShop);

				// Add event handlers for the sorters.
				$w("#sortDropdown").onChange(updateSort);
				$w("#sortOrderDropdown").onChange(updateSort);
			});
		}
		else if (customizationCategory == PassConstants.PASS_KEY) {
			// This setup is for the Passes only.
			let savedReleaseValue = session.getItem(KeyConstants.RELEASE_KEY);
			let savedPassTypeValue = session.getItem(KeyConstants.PASS_TYPE_KEY);

			$w("#releaseDataset").onReady(async function () {
				if (savedReleaseValue)
				{
					console.log("Found saved Release value: " + savedReleaseValue);
					$w("#releaseDropdown").value = savedReleaseValue;
				}
				if (savedPassTypeValue)
				{
					console.log("Found saved Pass Type value: " + savedPassTypeValue);
					$w("#passTypeDropdown").value = savedPassTypeValue;
				}

				await setOptionalFiltersPasses(true);

				filterBySearch(true);

				// If the Release filter is set.
				$w("#releaseDropdown").onChange(setOptionalFiltersPasses);

				// If the PassType filter is set.
				$w("#passTypeDropdown").onChange(setOptionalFiltersPasses);
			});
		}
		else if (customizationCategory == KeyConstants.TWITCH_DROPS_KEY) {
			let savedRewardValue = session.getItem(KeyConstants.REWARD_KEY);
			let savedFromValue = session.getItem(KeyConstants.TIME_FROM_KEY);
			let savedToValue = session.getItem(KeyConstants.TIME_TO_KEY);
			let savedFilterByValue = session.getItem(KeyConstants.TIME_FILTER_BY_KEY);
			let savedStatusValue = session.getItem(KeyConstants.STATUS_KEY);

			$w("#dropRewardDataset").onReady(async function () {
				if (savedRewardValue)
				{
					console.log("Found saved Reward value: " + savedRewardValue);
					$w("#rewardDropdown").value = savedRewardValue;
				}
				else 
				{
					console.log("Using default Reward value: RESET_ALL");
					$w("#rewardDropdown").value = "RESET_ALL";
				}
				if (savedFromValue)
				{
					
					console.log("Found saved Time From value: " + savedFromValue);
					$w("#startDatePicker").value = new Date(savedFromValue);
				}
				if (savedToValue) 
				{
					console.log("Found saved Time To value: " + savedToValue);
					$w("#endDatePicker").value = new Date(savedToValue);
				}
				if (savedFilterByValue) 
				{
					console.log("Found saved Filter By value: " + savedFilterByValue);
					$w("#timeFilterByDropdown").value = savedFilterByValue;
				}
				if (savedStatusValue) 
				{
					console.log("Found saved Status value: " + savedStatusValue);
					$w("#statusDropdown").value = savedStatusValue;
				}
				else
				{
					console.log("Using default Status value: RESET_ALL");
					$w("#statusDropdown").value = "RESET_ALL";
				}

				await setOptionalFiltersTwitchDrops(true);

				filterBySearch(true);

				// If the Reward filter is set.
				$w("#rewardDropdown").onChange(setOptionalFiltersTwitchDrops);

				// If the Start Date filter is set.
				$w("#startDatePicker").onChange(setOptionalFiltersTwitchDrops);

				// If the End Date filter is set.
				$w("#endDatePicker").onChange(setOptionalFiltersTwitchDrops);

				// If the Filter By filter is set.
				$w("#timeFilterByDropdown").onChange(setOptionalFiltersTwitchDrops);

				// If the Status filter is set.
				$w("#statusDropdown").onChange(setOptionalFiltersTwitchDrops);
			});
		}
		//#endregion

		//#region Setting user's saved quick search value.
		// If we have a saved quick search text string, apply it now.
		//#endregion

		//#region Creating and initializing variables based on customizationSection. Contains return statement.
		let hasSourceText = CustomizationConstants.IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY.includes(customizationCategory);

		let customizationDB = null; // The customization DB to be queried.
		// We want to grab the source categories for customization items and consumables, but not other uses of this code.
		if (hasSourceText) {
			// Initialize the variables with the appropriate values.
			switch (customizationCategory) {
				case ArmorConstants.ARMOR_KEY:
				case ArmorConstants.ARMOR_ATTACHMENT_KEY:
				case WeaponConstants.WEAPON_KEY:
				case VehicleConstants.VEHICLE_KEY:
				case BodyAndAiConstants.BODY_AND_AI_KEY:
				case SpartanIdConstants.SPARTAN_ID_KEY:
					customizationDB = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[customizationCategory].CustomizationDb;
					break;

				case ConsumablesConstants.CONSUMABLES_KEY:
					customizationDB = ConsumablesConstants.CONSUMABLES_DB;
					break;

				default:
					console.error("initialItemListSetup: Failed to find matching customization section. Was given " + customizationCategory);
					return -1;
			}
		}
		//#endregion

		//#region Setting image fit mode to "fit" for all items and setting Source text.
		$w("#listRepeater").onItemReady(async ($item, itemData) => {
			if (customizationCategory == KeyConstants.TWITCH_DROPS_KEY) {
				// We need to manually associate these images based on the references.
				let referencedRewards = await wixData.queryReferenced("TwitchDrops", itemData._id, "rewardReferences")
					.then((results) => {
						return results.items;
					})
					.catch((error) => {
						console.error("Error occurred while retrieving referenced rewards for a drop, ", error, itemData);
						return [];
					});

				if (referencedRewards.length > 0 && referencedRewards[0].imageSet && referencedRewards[0].imageSet.length > 0) {
					$item("#image").src = referencedRewards[0].imageSet[0]; // Associate the drop with its first reward if one is defined.
				}

				let rewardListText = "";

				if (referencedRewards.length === 0) {
					// There were no referenced rewards added to this drop. Use the rewardGroups field instead.
					if (itemData.rewardGroups) {
						for (let i = 0; i < itemData.rewardGroups.length; ++i) {
							for (let j = 0; j < itemData.rewardGroups[i].rewards.length; ++j) {
								rewardListText += "- " + itemData.rewardGroups[i].rewards[j].name;

								if (i < referencedRewards.length - 1) {
									// Add a newline separator in all but the last case.
									rewardListText += "\n";
								}
							}
						}
					}
				}
				else {
					for (let i = 0; i < referencedRewards.length; ++i) {
						rewardListText += "- " + referencedRewards[i].notificationText;

						if (i < referencedRewards.length - 1) {
							// Add a newline separator in all but the last case.
							rewardListText += "\n";
						}
					}
				}

				if (rewardListText === "") {
					rewardListText = "Rewards pending. Check back soon!";
				}

				$item("#rewardListText").text = rewardListText;
			}

			if (customizationCategory != PassConstants.PASS_KEY) { // If we aren't working with Passes, fit the image.
				$item("#image").fitMode = "fit";
			}
			else {
				$item("#passTypeText").text = ((itemData[PassConstants.PASS_IS_EVENT_FIELD]) ? "Event" : "Battle") + " Pass";
			}

			if (hasSourceText) { // If we're working with a customization item or consumable.
				let currentItem = itemData;
				let sourceString = "";
				wixData.queryReferenced(customizationDB, currentItem._id, sourceTypeReferenceField)
					.then((results) => {
						results.items.forEach(element => {
							sourceString += element[CustomizationConstants.SOURCE_TYPE_NAME_FIELD] + ", ";
						});

						// Remove the final comma.
						sourceString = sourceString.substr(0, sourceString.length - 2);

						$item("#itemSources").text = sourceString;
					})
					.catch((error) => {
						console.error("Error occurred while querying " + customizationDB + ": " + error);
					});
			}
		});
		//#endregion
	});
}
