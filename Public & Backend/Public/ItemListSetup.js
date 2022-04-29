// Filename: public/ItemListSetup.js
// This file contains the code necessary to setup and update the Item List pages, including their filters.

// TODO: Change *CoreText to coreText and *SocketText to socketText

import {session} from 'wix-storage';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import {setPaginationIndexFromSave} from 'public/Pagination.js';
import * as KeyConstants from 'public/KeyConstants.js';
import * as URLConstants from 'public/URLConstants.js';

//#region Initializing all filter objects.
let filter = wixData.filter(); // The filter for the dataset content displayed. The value will be established based on URL parameters. DO NOT CHANGE AFTER THIS!!!
let searchFilter = wixData.filter(); // The filter for the dataset content displayed, plus the search in the name.
let optionalFilter = wixData.filter(); // The filter including the current dropdown selections.
//#endregion

let nameField = "itemName"; // This will store the nameField used for each page. It's itemName for everything except the Passes page, which uses "title".

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

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFilters() {
	optionalFilter = filter;

	// First we add the Quality filter.
	let qualityDropdownSelection = $w("#qualityDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.QUALITY_KEY, qualityDropdownSelection);

	switch(qualityDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query("QualityRatings")
				.eq("quality", qualityDropdownSelection)
				.find()
				.then( (results) => {
					//console.log(results);
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq("qualityReference", selectedKey);
					}
				});
			break;
	}

	// Next, we add the Available Filter.
	let availableDropdownSelection = $w("#availableDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.AVAILABLE_KEY, availableDropdownSelection);

	switch(availableDropdownSelection) {
		case "Yes":
			optionalFilter = optionalFilter.eq("currentlyAvailable", true);
			break;
		case "No":
			optionalFilter = optionalFilter.ne("currentlyAvailable", true);
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
			optionalFilter = optionalFilter.eq("hidden", true);
			break;
		case "No Hidden":
			optionalFilter = optionalFilter.ne("hidden", true);
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
			await wixData.query("Releases")
				.eq("release", releaseDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// filter
						optionalFilter = optionalFilter.eq("releaseReference", selectedKey);
							
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
		let name = itemData.name;

		session.setItem(name, String(isChecked));

		if (isChecked) {
			sourceIDArray.push(id);
			if (name == "(Pending)") {
				pendingSelected = true;
			}
		}

		fullSourceIdArray.push(id);
	});

	// Match items based on the array contents if the array and item source reference match at least in one case.
	console.log("The array of source IDs to search for: " + String(sourceIDArray));
	if (!pendingSelected) {
		optionalFilter = optionalFilter.hasSome("sourceTypeReference", sourceIDArray);
	}
	else {
		let tempFilter = optionalFilter;
		optionalFilter = optionalFilter.hasSome("sourceTypeReference", sourceIDArray);
		optionalFilter = optionalFilter.or(tempFilter.not(wixData.filter().hasSome("sourceTypeReference", fullSourceIdArray)));
	}

	// Append the searchFilter contents to the optionalFilter.
	$w("#dynamicDataset").setFilter(optionalFilter.and(searchFilter.isNotEmpty("itemName")))
	//$w("#dynamicDataset").setFilter(optionalFilter.not(wixData.filter().hasSome("sourceTypeReference", fullSourceIdArray)))
		.then(function() {
			console.log("Resetting pagination to 1 after optional filter.");
			$w("#pagination1").currentPage = 1;
        	$w("#dynamicDataset").loadPage(1);
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFiltersShop() {
	optionalFilter = filter;

	// First we add the Quality filter.
	let qualityDropdownSelection = $w("#qualityDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.QUALITY_KEY, qualityDropdownSelection);

	switch(qualityDropdownSelection) {
		case "Any":
			optionalFilter = optionalFilter.contains("qualityReference", "");
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query("QualityRatings")
				.eq("quality", qualityDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq("qualityReference", selectedKey);
						console.log(optionalFilter);
					}
				});
			break;
	}

	// Next, we add the Available Filter.
	let availableDropdownSelection = $w("#availableDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.AVAILABLE_KEY, availableDropdownSelection);

	switch(availableDropdownSelection) {
		case "Yes":
			optionalFilter = optionalFilter.eq("currentlyAvailable", true);
			break;
		case "No":
			optionalFilter = optionalFilter.eq("currentlyAvailable", false);
			break;
		default:
			optionalFilter = optionalFilter.eq("currentlyAvailable", false).or(optionalFilter.eq("currentlyAvailable", true));
			break;
	}

	// Now, we need to add the Timeframe Filter.
	let timeframeDropdownSelection = $w("#timeframeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.TIMEFRAME_KEY, timeframeDropdownSelection);

	switch(timeframeDropdownSelection) {
		case "Any":
			optionalFilter = optionalFilter.contains("timeType", "");
			break;
		default:
			optionalFilter = optionalFilter.contains("timeType", timeframeDropdownSelection);
	}

	// Finally, we add the Shop Type filter.
	let shopTypeDropdownSelection = $w("#shopTypeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.SHOP_TYPE_KEY, shopTypeDropdownSelection);

	switch(shopTypeDropdownSelection) {
		case "HCS":
			optionalFilter = optionalFilter.eq("isHcs", true);
			break;
		case "Normal":
			optionalFilter = optionalFilter.eq("isHcs", false);
			break;
		default:
			optionalFilter = optionalFilter.eq("isHcs", false).or(optionalFilter.eq("isHcs", true));
			break;
	}

	console.log("After all optional filtering.");
	console.log(optionalFilter);

	// Append the searchFilter contents to the optionalFilter.
	console.log("After name filtering is added.");
	console.log(optionalFilter.and(searchFilter.isNotEmpty("itemName")));

	$w("#dynamicDataset").setFilter(optionalFilter.and(searchFilter.isNotEmpty("itemName")))
		.then(function() {
			console.log("Resetting pagination to 1 after optional filter.");
			$w("#pagination1").currentPage = 1;
        	$w("#dynamicDataset").loadPage(1);
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

// This function is used to set the optional filters (e.g. quality, release, etc.).
async function setOptionalFiltersPasses() {
	optionalFilter = filter;

	// First we add the Release filter.
	let releaseDropdownSelection = $w("#releaseDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.RELEASE_KEY, releaseDropdownSelection);

	switch(releaseDropdownSelection) {
		case "Any":
			break;
		default:
			// First, we find the quality listing in the Quality Ratings database. Then we use the ID of that item to match it to everything referring to that item.
			await wixData.query("Releases")
				.eq("release", releaseDropdownSelection)
				.find()
				.then( (results) => {
					if(results.items.length > 0) {
						let firstItem = results.items[0]; // The matching item
						let selectedKey = firstItem._id;
						// Add the filter to the set.
						optionalFilter = optionalFilter.eq("season", selectedKey);
						console.log(optionalFilter);
					}
				});
			break;
	}	

	// Finally, we add the Shop Type filter.
	let passTypeDropdownSelection = $w("#passTypeDropdown").value; // The item selected from the dropdown.
	session.setItem(KeyConstants.PASS_TYPE_KEY, passTypeDropdownSelection);

	switch(passTypeDropdownSelection) {
		case "Event":
			optionalFilter = optionalFilter.eq("isEvent", true);
			break;
		case "Battle":
			optionalFilter = optionalFilter.eq("isEvent", false);
			break;
		default:
			break;
	}

	console.log("After all optional filtering.");
	console.log(optionalFilter);

	// Append the searchFilter contents to the optionalFilter.
	console.log("After name filtering is added.");
	console.log(optionalFilter.and(searchFilter.isNotEmpty("title")));

	$w("#dynamicDataset").setFilter(optionalFilter.and(searchFilter.isNotEmpty("title")))
		.then(function() {
			console.log("Resetting pagination to 1 after optional filter.");
			$w("#pagination1").currentPage = 1;
        	$w("#dynamicDataset").loadPage(1);
		})
		.catch((error) => { console.error("Could not add filter " + error) });
}

//#region Creating debounce timer and implementing search filter.
let debounceTimer; // If the debounceTimer is set (we are working), then we don't want to start it again. 
// This lets us filter immediately upon text input change and wait a little bit before doing it again.

// Filter by search criteria.
function filterBySearch () {
	if (debounceTimer) {
      	clearTimeout(debounceTimer);
      	debounceTimer = undefined;
   	}
   	debounceTimer = setTimeout(() => {
      	//console.log($w("#nameSearch").value);
		let searchFilterApplied = optionalFilter; // The filter for the dataset content displayed.

		// Define the filter. We use a second filter to store just the search part.
		searchFilter = filter.contains(nameField, $w("#nameSearch").value);
		searchFilterApplied = optionalFilter.contains(nameField, $w("#nameSearch").value);

		session.setItem(KeyConstants.QUICK_SEARCH_KEY, $w("#nameSearch").value);

		//console.log(searchFilterApplied);
		
		$w("#dynamicDataset").setFilter(searchFilterApplied)
			.then(function() {
				console.log("Resetting pagination to 1 after search filter.");
				$w("#pagination1").currentPage = 1;
				$w("#dynamicDataset").loadPage(1);
			})
			.catch( (err) => {
				console.error(err);
			});
      	// some sort of query that might overlap execution 
   	}, 250); // 250 milliseconds works for me, your mileage may vary
}
//#endregion

export function initialItemListSetup(customizationSection) {
    //#region Setting up Filter menu buttons and collapsing the menu.
	// Set up the Filter menu by setting the closeButton to collapse the Filter menu and collapsing the menu.
	if (customizationSection != KeyConstants.CAPSTONE_CHALLENGE_SECTION) { // We don't have any Challenge filters for now.
		$w("#closeButton").onClick(collapseFilterMenu);
		$w("#filterButton").onClick(expandFilterMenu);
		$w("#filterButtonClose").onClick(collapseFilterMenu);
		collapseFilterMenu();
	}
    //#endregion

	// We want to update the name search text ASAP.
	let savedQuickSearchText = session.getItem(KeyConstants.QUICK_SEARCH_KEY);
	if (savedQuickSearchText)
	{
		$w("#nameSearch").value = savedQuickSearchText;
	}

	if (customizationSection == KeyConstants.PASSES_SECTION || customizationSection == KeyConstants.CAPSTONE_CHALLENGE_SECTION) {
		nameField = "title"; // Set the unique name field here.
	}

    //#region Checking to see if Core/socket filtering is necessary (i.e. we are working with Armor, Weapons, or Vehicles).
    let filterByCore = false; // By default, we don't need to do core filtering
    let filterBySocket = true; // We almost always want to filter by socket, but we don't for Consumables.

    switch (customizationSection) {
        case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
		case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
		case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
            filterByCore = true;
            break;
        case KeyConstants.CONSUMABLES_SECTION:
		case KeyConstants.SHOP_LISTINGS_SECTION:
		case KeyConstants.PASSES_SECTION:
		case KeyConstants.CAPSTONE_CHALLENGE_SECTION:
            filterBySocket = false;
    }

    //#endregion
    
    if (filterByCore || filterBySocket) {
        //#region Creating and initializing variables based on customizationSection. Contains return statement.
        let query = wixLocation.query; // Needed to get URL parameters.

        let coreID = ""; // The Core ID
        let coreName = ""; // The name of the selected Core (or All * Cores if not found.)
        let coreDB = ""; // The name of the Core database.
        let coreReferenceField = ""; // The name of the Core Multireference Field in the Customization database.
        let anyCoreID = ""; // The ID of the "Any" Core.

        let socketID = ""; // The socket ID
        let socketName = ""; // The name of the selected socket (or All * Sockets if not found.)
        let socketDB = ""; // The name of the socket database.
        let socketReferenceField = ""; // The name of the socket Multireference Field in the Customization database.

        let tempCoreID; // We want to use a temporary Core ID since we are checking to see if the URL param is undefined.
        let tempSocketID; // We want to use a temporary socket ID for a similar reason.

        // Initialize the variables with the appropriate values.
        switch (customizationSection) {
            case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
                tempCoreID = query[URLConstants.URL_ARMOR_CORE_PARAM];
                tempSocketID = query[URLConstants.URL_ARMOR_SOCKET_PARAM];

                coreName = "All Armor Cores";
                socketName = "All Armor Sockets";

                coreDB = KeyConstants.ARMOR_CORE_DB;
                socketDB = KeyConstants.ARMOR_SOCKET_DB;

                coreReferenceField = KeyConstants.ARMOR_CORE_REFERENCE_FIELD;
                socketReferenceField = KeyConstants.ARMOR_SOCKET_REFERENCE_FIELD;

                anyCoreID = KeyConstants.ANY_ARMOR_CORE_ID;
                break;

			case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
				tempCoreID = query[URLConstants.URL_WEAPON_CORE_PARAM];
                tempSocketID = query[URLConstants.URL_WEAPON_SOCKET_PARAM];

                coreName = "All Weapon Cores";
                socketName = "All Weapon Sockets";

                coreDB = KeyConstants.WEAPON_CORE_DB;
                socketDB = KeyConstants.WEAPON_SOCKET_DB;

                coreReferenceField = KeyConstants.WEAPON_CORE_REFERENCE_FIELD;
                socketReferenceField = KeyConstants.WEAPON_SOCKET_REFERENCE_FIELD;

                anyCoreID = KeyConstants.ANY_WEAPON_CORE_ID;
                break; 

			case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
				tempCoreID = query[URLConstants.URL_VEHICLE_CORE_PARAM];
                tempSocketID = query[URLConstants.URL_VEHICLE_SOCKET_PARAM];

                coreName = "All Vehicle Cores";
                socketName = "All Vehicle Sockets";

                coreDB = KeyConstants.VEHICLE_CORE_DB;
                socketDB = KeyConstants.VEHICLE_SOCKET_DB;

                coreReferenceField = KeyConstants.VEHICLE_CORE_REFERENCE_FIELD;
                socketReferenceField = KeyConstants.VEHICLE_SOCKET_REFERENCE_FIELD;

                anyCoreID = KeyConstants.ANY_VEHICLE_CORE_ID;
                break; 
				
			case KeyConstants.BODY_AND_AI_CUSTOMIZATION_SECTION:
				tempCoreID = undefined;
                tempSocketID = query[URLConstants.URL_BODY_AND_AI_SOCKET_PARAM];

                coreName = undefined;
                socketName = "All Body & AI Categories";

                coreDB = undefined;
                socketDB = KeyConstants.BODY_AND_AI_SOCKET_DB;

                coreReferenceField = undefined;
                socketReferenceField = KeyConstants.BODY_AND_AI_SOCKET_REFERENCE_FIELD;

                anyCoreID = undefined;
                break; 

			case KeyConstants.SPARTAN_ID_CUSTOMIZATION_SECTION:
				tempCoreID = undefined;
                tempSocketID = query[URLConstants.URL_SPARTAN_ID_SOCKET_PARAM];

                coreName = undefined;
                socketName = "All Spartan ID Categories";

                coreDB = undefined;
                socketDB = KeyConstants.SPARTAN_ID_SOCKET_DB;

                coreReferenceField = undefined;
                socketReferenceField = KeyConstants.SPARTAN_ID_SOCKET_REFERENCE_FIELD;

                anyCoreID = undefined;
                break; 

            default:
                console.error("initialItemListSetup: Failed to find matching customization section. Was given " + customizationSection);
                return -1;
        }
        //#endregion

		if (customizationSection == KeyConstants.ARMOR_CUSTOMIZATION_SECTION || customizationSection == KeyConstants.WEAPON_CUSTOMIZATION_SECTION) {
			filter = filter.not(filter.eq("isKitItemOnly", true)); // Hide items we don't want to include in the general list (Kit items).
		}

        //#region Setting URL filters
        // Set the filter based on the content we have been provided in the URL. No filter if no parameters provided in URL.
        if (typeof(tempCoreID) != "undefined" && typeof(tempSocketID) != "undefined") {
            // The Core and socket were provided in the URL parameters.
            coreID = tempCoreID;
            socketID = tempSocketID;

            filter = filter.hasSome(coreReferenceField, [coreID])
                .or(filter.hasSome(coreReferenceField, [anyCoreID]))
                .and(filter.eq(socketReferenceField, socketID));
        }
        else if (typeof(tempCoreID) != "undefined") {
            // Only the Core was provided in the URL parameters.
            coreID = tempCoreID;
            
            filter = filter.hasSome(coreReferenceField, [coreID])
                .or(filter.hasSome(coreReferenceField, [anyCoreID]));
        }
        else if (typeof(tempSocketID) != "undefined") {
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

        //#region Setting Filter and using saved pagination index.
        $w("#dynamicDataset").setFilter(filter)
            .then(function(){
                console.log("Setting Pagination Index");
                setPaginationIndexFromSave();
                console.log("Pagination Index Set");
            })
            .catch( (err) => {
                console.log(err);
            });
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
                        coreName = firstItem.name;
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
                    socketName = firstItem.name; // The name of the matching item
                }

                $w("#socketText").text = socketName;	
            });
        //#endregion
    }

	//#region Setting user's saved quick search value.
	// If we have a saved quick search text string, apply it now.
	filterBySearch();
	console.log("Setting Pagination Index after inital name filter.");
	setPaginationIndexFromSave();
	console.log("Pagination Index Set after initial name filter.");
    //#endregion

    //#region Setting quick search auto-update behavior
	$w("#nameSearch").onKeyPress(filterBySearch);
    //#endregion

    //#region Setting user's saved filter values.
	// If we have saved configurations for the filters, set them now.
	if (customizationSection != KeyConstants.SHOP_LISTINGS_SECTION && customizationSection != KeyConstants.PASSES_SECTION && customizationSection != KeyConstants.CAPSTONE_CHALLENGE_SECTION) {
		let savedQualityValue = session.getItem(KeyConstants.QUALITY_KEY);
		let savedHiddenValue = session.getItem(KeyConstants.HIDDEN_KEY);
		let savedAvailableValue = session.getItem(KeyConstants.AVAILABLE_KEY);
		let savedReleaseValue = session.getItem(KeyConstants.RELEASE_KEY);

		$w("#qualityDataset").onReady(function () {
			$w("#releaseDataset").onReady(function () {
				$w("#sourcesDataset").onReady(function() {
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

					// Set up the initial checkbox states.
					$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
						let name = itemData.name;
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

					setOptionalFilters();

					// If the Quality filter is set.
					$w("#qualityDropdown").onChange(setOptionalFilters);

					// If the Hidden filter is set.
					$w("#hiddenDropdown").onChange(setOptionalFilters);

					// If the Available filter is set.
					$w("#availableDropdown").onChange(setOptionalFilters);

					// If the Release filter is set.
					$w("#releaseDropdown").onChange(setOptionalFilters);

					// If the Select All button is set, we set all checkboxes to true and then retrigger optional filters.
					$w("#selectAllButton").onClick(function() {
						$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
							$item("#sourceCheckbox").checked = true;
							session.setItem(itemData.name, String($item("#sourceCheckbox").checked));
						});

						setOptionalFilters();
					});

					// If the Deselect All button is clicked, we set all checkboxes to false and then retrigger optional filters.
					$w("#deselectAllButton").onClick(function() {
						$w("#sourceRepeater").forEachItem(($item, itemData, index) => {
							$item("#sourceCheckbox").checked = false;
							session.setItem(itemData.name, String($item("#sourceCheckbox").checked));
						});

						setOptionalFilters();
					});

					console.log("Setting Pagination Index after initial optional filter.");
					setPaginationIndexFromSave();
					console.log("Pagination Index Set after initial optional filter.");
				});
			});
		});
	}
	else if (customizationSection == KeyConstants.SHOP_LISTINGS_SECTION) {
		// This setup is for the Shop only.
		let savedQualityValue = session.getItem(KeyConstants.QUALITY_KEY);
		let savedTimeframeValue = session.getItem(KeyConstants.TIMEFRAME_KEY);
		let savedAvailableValue = session.getItem(KeyConstants.AVAILABLE_KEY);
		let savedShopTypeValue = session.getItem(KeyConstants.SHOP_TYPE_KEY);

		$w("#qualityDataset").onReady(function () {
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

			setOptionalFiltersShop();

			// If the Quality filter is set.
			$w("#qualityDropdown").onChange(setOptionalFiltersShop);

			// If the Timeframe filter is set.
			$w("#timeframeDropdown").onChange(setOptionalFiltersShop);

			// If the Available filter is set.
			$w("#availableDropdown").onChange(setOptionalFiltersShop);

			// If the Shop Type filter is set.
			$w("#shopTypeDropdown").onChange(setOptionalFiltersShop);

			console.log("Setting Pagination Index after initial optional filter.");
			setPaginationIndexFromSave();
			console.log("Pagination Index Set after initial optional filter.");
		});
	}
	else if (customizationSection == KeyConstants.PASSES_SECTION) {
		// This setup is for the Shop only.
		let savedReleaseValue = session.getItem(KeyConstants.RELEASE_KEY);
		let savedPassTypeValue = session.getItem(KeyConstants.PASS_TYPE_KEY);

		$w("#releaseDataset").onReady(function () {
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

			setOptionalFiltersPasses();

			// If the Release filter is set.
			$w("#releaseDropdown").onChange(setOptionalFiltersPasses);

			// If the PassType filter is set.
			$w("#passTypeDropdown").onChange(setOptionalFiltersPasses);

			console.log("Setting Pagination Index after initial optional filter.");
			setPaginationIndexFromSave();
			console.log("Pagination Index Set after initial optional filter.");
		});
	}
    //#endregion

	//#region Creating and initializing variables based on customizationSection. Contains return statement.
	let hasSourceText = false; // We want to grab the source categories for customization items and consumables, but not other uses of this code.

	switch(customizationSection) {
		case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
		case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
		case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
		case KeyConstants.BODY_AND_AI_CUSTOMIZATION_SECTION:
		case KeyConstants.SPARTAN_ID_CUSTOMIZATION_SECTION:
		case KeyConstants.CONSUMABLES_SECTION:
			hasSourceText = true;
	}

	let customizationDB = ""; // The customization DB to be queried.

	if (hasSourceText) {
		// Initialize the variables with the appropriate values.
		switch (customizationSection) {
			case KeyConstants.ARMOR_CUSTOMIZATION_SECTION:
				customizationDB = KeyConstants.ARMOR_CUSTOMIZATION_DB;
				break;

			case KeyConstants.WEAPON_CUSTOMIZATION_SECTION:
				customizationDB = KeyConstants.WEAPON_CUSTOMIZATION_DB;
				break; 

			case KeyConstants.VEHICLE_CUSTOMIZATION_SECTION:
				customizationDB = KeyConstants.VEHICLE_CUSTOMIZATION_DB;
				break; 
				
			case KeyConstants.BODY_AND_AI_CUSTOMIZATION_SECTION:
				customizationDB = KeyConstants.BODY_AND_AI_CUSTOMIZATION_DB;
				break; 

			case KeyConstants.SPARTAN_ID_CUSTOMIZATION_SECTION:
				customizationDB = KeyConstants.SPARTAN_ID_CUSTOMIZATION_DB;
				break; 

			case KeyConstants.CONSUMABLES_SECTION:
				customizationDB = KeyConstants.CONSUMABLES_DB;
				break;

			default:
				console.error("initialItemListSetup: Failed to find matching customization section. Was given " + customizationSection);
				return -1;
		}
	}
	//#endregion

    //#region Setting image fit mode to "fit" for all items and setting Source text.
	$w("#listRepeater").onItemReady(($item, itemData) => { 
		if (customizationSection != KeyConstants.PASSES_SECTION) {
			$item("#image").fitMode = "fit"; 
		}

		if (customizationSection == KeyConstants.PASSES_SECTION) {
			$item("#passTypeText").text = ((itemData.isEvent) ? "Event" : "Battle") + " Pass";
		}

		if (hasSourceText) {
			let currentItem = itemData;
			let sourceString = "";
			wixData.queryReferenced(customizationDB, currentItem._id, "sourceTypeReference")
				.then((results) => {
					results.items.forEach(element => {
						sourceString += element.name + ", ";
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
}