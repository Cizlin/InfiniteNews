// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

import wixLocation from 'wix-location';
import * as CustomizationSearchFunctions from 'public/CustomizationSearch.js';

let searchResults = [];
const RESULTS_PER_PAGE = 20;

function updateRepeaterItems() {
	$w("#listRepeater").forEachItem(($item, itemData) => {
		$item("#resultName").text = itemData.name;
		$item("#resultDescription").text = "\n" + itemData.description;
		$item("#resultButton").link = itemData.url;
		if (itemData.hasVideo) {
			$item("#resultImage").hide();
			$item("#effectVideoPlayer").show();
			$item("#effectVideoPlayer").src = itemData.image
		}
		else {
			$item("#effectVideoPlayer").hide();
			$item("#resultImage").show();
			$item("#resultImage").src = itemData.image;
			$item("#resultImage").fitMode = "fit";
		}
	});
}

function displaySearchResults() {
	// Determine how many pages of data there will be.
	let numPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE); // We need an extra page for the remainder of items.

	if (numPages <= 1) {
		$w("#pagination1").hide();
	}
	else {
		$w("#pagination1").totalPages = numPages;
		$w("#pagination1").currentPage = 1; // Set page to 1.
		$w("#pagination1").show();

		$w("#pagination1").onChange(() => {
			let startIndex = ($w("#pagination1").currentPage - 1) * RESULTS_PER_PAGE;
			let endIndex = startIndex + RESULTS_PER_PAGE;

			// Only display up to the number of results we allow per page.
			$w("#listRepeater").data = searchResults.slice(startIndex, endIndex);
			updateRepeaterItems();
		});
	}

	// Only display up to the number of results we allow per page.
	$w("#listRepeater").data = searchResults.slice(0, 0 + RESULTS_PER_PAGE);
	updateRepeaterItems();
}

//#region Creating debounce timer and implementing search bar.
let debounceTimer; // If the debounceTimer is set when we update the text input, it restarts the wait time.
// This lets us wait for a few ms before filtering upon text input change, implementing effective debounce.
function performSearch(copyValueFromHeaderBox = false) {
	$w("#autocompleteRepeater").data = [];

	let categoriesToQuery = [];

	$w("#categoryRepeater").forEachItem($item => {
		if ($item("#categoryCheckbox").checked) {
			categoriesToQuery.push($item("#categoryName").text);
		}
	});

	$w("#searchStatus").text = "Searching...";
	$w("#searchStatus").show();

	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
	}
	debounceTimer = setTimeout(async () => {

		// If the user typed the value in the header search box rather than in the main one, we should just copy that value down and search from there.
		if (copyValueFromHeaderBox) {
			$w("#customizationSearchInput").value = $w("#customizationSearchBar").value;
		}

		let searchStatus = [0]; // Initialize the search status as an array with our integer return code status as the 0 element.
		searchResults = await CustomizationSearchFunctions.nameSearch($w("#customizationSearchInput").value, categoriesToQuery, searchStatus);
		wixLocation.to("/customization-search-results?search=" + $w("#customizationSearchInput").value);

		if (searchStatus[0] == 1) {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "Search completed with errors. Please try again in a few minutes..."
			}
			else {
				$w("#searchStatus").text = "Search completed with errors. " + searchResults.length + " item" + ((searchResults.length != 1) ? "s" : "") + " found, but more may exist.";
			}
		}
		else if (searchStatus[0] == 2) {
			$w("#searchStatus").text = "Search timed out. Please try again...";
		}
		else {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "No items match your search..."
			}
			else {
				$w("#searchStatus").text = "Search completed! " + searchResults.length + " item" + ((searchResults.length != 1) ? "s" : "") + " found.";
			}
		}

		displaySearchResults();

	}, 250); // 250 milliseconds works for me, your mileage may vary
}
//#endregion

$w.onReady(async function () {
	// Empty the autocomplete repeater and set it up to disappear when clicking away from it.
	$w("#autocompleteRepeater").data = [];

	//$w("#autocompleteRepeater").hide();
	//$w("#autocompleteRepeater").collapse();

	// Collapse the filters by default and hide the close Filter button.
	$w("#filterButtonClose").hide();
	$w("#filterButton").disable(); // Disable the filter buttons so we don't accidentally trigger the container to reopen.
	$w("#filterButtonClose").disable();
	$w("#categoryContainer").hide("roll", {
			"duration": 250,
			"direction": "top"
		})
		.then(() => {
			$w("#categoryContainer").collapse()
				.then(() => {
					$w("#filterButton").enable();
					$w("#filterButtonClose").enable();
				});
		})

	// Hide the search status, initialize the repeater with an empty dataset, and hide the pagination.
	$w("#searchStatus").hide();
	$w("#listRepeater").data = [];
	$w("#pagination1").hide();

	// Initialize the Categories buttons.
	$w("#categoryRepeater").forEachItem($item => {
		$item("#checkBoxButton").onClick(() => {
			$item("#categoryCheckbox").checked = !$item("#categoryCheckbox").checked;
		});
	});

	// Initialize the Select and Deselect All buttons.
	$w("#deselectAllButton").onClick(() => {
		$w("#categoryRepeater").forEachItem($item => {
			$item("#categoryCheckbox").checked = false;
		});
	});

	$w("#selectAllButton").onClick(() => {
		$w("#categoryRepeater").forEachItem($item => {
			$item("#categoryCheckbox").checked = true;
		});
	});

	// Initialize the Filter open and close buttons.
	$w("#filterButton").onClick(() => {
		$w("#filterButtonClose").disable();
		$w("#filterButton").disable();
		$w("#categoryContainer").expand()
			.then(() => {
				$w("#categoryContainer").show("roll", {
					"duration": 250,
					"direction": "top"
				})
				.then(() => {
					$w("#filterButton").hide();
					$w("#filterButtonClose").show();
					$w("#filterButton").enable();
					$w("#filterButtonClose").enable();
				});
			});
	});

	$w("#filterButtonClose").onClick(() => {
		$w("#filterButtonClose").disable();
		$w("#filterButton").disable();
		$w("#categoryContainer").hide("roll", {
				"duration": 250,
				"direction": "top"
			})
			.then(() => {
				$w("#categoryContainer").collapse()
					.then(() => {
						$w("#filterButton").show();
						$w("#filterButtonClose").hide();
						$w("#filterButton").enable();
						$w("#filterButtonClose").enable();
					});
			});
	});

	// Retrieve the user's initial query from the URL args if they provided one.
	let query = wixLocation.query;
	let initialSearchTerm = query.search;
	if (initialSearchTerm) {
		$w("#customizationSearchInput").value = initialSearchTerm;
		$w("#searchStatus").text = "Searching...";
		$w("#searchStatus").show();

		let categoriesToQuery = [];

		$w("#categoryRepeater").forEachItem($item => {
			if ($item("#categoryCheckbox").checked) {
				categoriesToQuery.push($item("#categoryName").text);
			}
		});

		let searchStatus = [0]; // Initialize the search status as an array with our boolean status as the 0 element.
		searchResults = await CustomizationSearchFunctions.nameSearch(initialSearchTerm, categoriesToQuery, searchStatus);

		if (searchStatus[0] == 1) {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "Search completed with errors. Please try again in a few minutes..."
			}
			else {
				$w("#searchStatus").text = "Search completed with errors. " + searchResults.length + " item" + ((searchResults.length != 1) ? "s" : "") + " found, but more may exist.";
			}
		}
		else if (searchStatus[0] == 2) {
			$w("#searchStatus").text = "Search timed out. Please try again...";
		}
		else {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "No items match your search..."
			}
			else {
				$w("#searchStatus").text = "Search completed! " + searchResults.length + " item" + ((searchResults.length != 1) ? "s" : "") + " found.";
			}
		}

		displaySearchResults();
	}

	let quickDebounceTimer;

	$w("#customizationSearchInput").onKeyPress(event => {
		if(event.key == "Enter") {
			$w("#autocompleteRepeater").data = [];
			performSearch();
		} else {
			if (quickDebounceTimer) {
				clearTimeout(quickDebounceTimer);
				quickDebounceTimer = undefined;
			}

			quickDebounceTimer = setTimeout(async () => {
				// If we have nothing in the search box, no need to keep the autocomplete open.
				if (($w("#customizationSearchInput").value == "")) {
					$w("#autocompleteRepeater").data = [];
					return;
				}

				let categoriesToQuery = [];

				$w("#categoryRepeater").forEachItem($item => {
					if ($item("#categoryCheckbox").checked) {
						categoriesToQuery.push($item("#categoryName").text);
					}
				});
				
				let searchStatus = [0];
				console.log($w("#customizationSearchInput").value);
				let searchName = $w("#customizationSearchInput").value;
				searchResults = await CustomizationSearchFunctions.nameSearch(searchName, categoriesToQuery, searchStatus, true);

				if (searchName != $w("#customizationSearchInput").value) {
					// We don't need this data anymore since the value was updated.
					return;
				}

				//console.log(searchResults);

				// Set up the autocomplete repeater.
				$w("#autocompleteRepeater").data = searchResults;
				$w("#autocompleteRepeater").forEachItem(($item, itemData) => {
					// Each item should show a valid name in the DBs. Clicking the name should put it in the search box and search for it.
					$item("#autocompleteText").text = itemData.name;
					$item("#autocompleteButton").onClick(() => {
						$w("#customizationSearchInput").value = itemData.name;
						performSearch();
					});
				});

			}, 250);
		}
	});

	$w("#customizationSearchInput").onFocus(() => {
		// Show the autocomplete repeater in case it's been hidden.
		$w("#autocompleteRepeater").show();
	});

	$w("#customizationSearchInput").onBlur(() => {
		// We clicked away from the search input. Hide the repeater.
		$w("#autocompleteRepeater").hide();
	});

	$w("#searchButton").onClick(() => {
		performSearch();
	});

	let quickGlobalDebounceTimer;

	$w("#customizationSearchBar").onKeyPress(event => {
		if(event.key == "Enter") {
			$w("#globalAutocompleteRepeater").data = [];
			performSearch(true); // We want to copy the value to the primary input box before we search.
		}
		else {
			if (quickGlobalDebounceTimer) {
                clearTimeout(quickGlobalDebounceTimer);
                quickGlobalDebounceTimer = undefined;
            }

            quickGlobalDebounceTimer = setTimeout(async () => {
                if ($w("#customizationSearchBar").value == "") {
                    // Hide the autocomplete if we have nothing in the search bar.
                    $w("#globalAutocompleteRepeater").data = [];
                    return;
                }

                let categoriesToQuery = [];

				$w("#categoryRepeater").forEachItem($item => {
					if ($item("#categoryCheckbox").checked) {
						categoriesToQuery.push($item("#categoryName").text);
					}
				});
                
                let searchStatus = [0];
                let searchName = $w("#customizationSearchBar").value
                let searchResults = await CustomizationSearchFunctions.nameSearch(searchName, categoriesToQuery, searchStatus, true, 4);

                if (searchName != $w("#customizationSearchBar").value) {
					// We don't need this data anymore since the value was updated.
					return;
				}

                //console.log(searchResults);

                // Set up the autocomplete repeater.
                $w("#globalAutocompleteRepeater").data = searchResults;
                $w("#globalAutocompleteRepeater").forEachItem(($item, itemData) => {
                    // Each item should show a valid name in the DBs. Clicking the name should put it in the search box and search for it.
                    // We also want to "close" the autocomplete repeater once we've chosen something from it.
                    $item("#globalAutocompleteText").text = itemData.name;
                    $item("#globalAutocompleteButton").onClick(() => {
                        $w("#customizationSearchBar").value = itemData.name;
                        $w("#globalAutocompleteRepeater").data = [];
						performSearch(true);
                    });
                });
			}, 250);
		}
	});
});
