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

		let searchStatus = [false]; // Initialize the search status as an array with our boolean status as the 0 element.
		searchResults = await CustomizationSearchFunctions.nameSearch($w("#customizationSearchInput").value, categoriesToQuery, searchStatus);
		wixLocation.to("/customization-search-results?search=" + $w("#customizationSearchInput").value);

		if (!searchStatus[0]) {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "Search completed with errors. Please try again in a few minutes..."
			}
			else {
				$w("#searchStatus").text = "Search completed with errors. " + searchResults.length + " items found, but more may exist.";
			}
		}
		else {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "No items match your search..."
			}
			else {
				$w("#searchStatus").text = "Search completed! " + searchResults.length + " items found.";
			}
		}

		displaySearchResults();

	}, 250); // 250 milliseconds works for me, your mileage may vary
}
//#endregion

$w.onReady(async function () {
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

		let searchStatus = [false]; // Initialize the search status as an array with our boolean status as the 0 element.
		searchResults = await CustomizationSearchFunctions.nameSearch(initialSearchTerm, categoriesToQuery, searchStatus);

		if (!searchStatus[0]) {
			if (searchResults.length == 0) {
				$w("#searchStatus").text = "Search completed with errors. Please try again in a few minutes..."
			}
			else {
				$w("#searchStatus").text = "Search completed with errors. " + searchResults.length + " item" + 
					((searchResults.length != 1) ? "s" : "") + " found, but more may exist.";
			}
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

	$w("#customizationSearchInput").onKeyPress(event => {
		if(event.key == "Enter") {
			performSearch();
		}
	});

	$w("#searchButton").onClick(() => {
		performSearch();
	});

	$w("#customizationSearchBar").onKeyPress(event => {
		if(event.key == "Enter") {
			performSearch(true); // We want to copy the value to the primary input box before we search.
		}
	});
});
