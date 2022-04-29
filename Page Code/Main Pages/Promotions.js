import wixData from 'wix-data';
// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
	$w("#showAllPromosButton").hide();
	$w("#sortByPublishButton").hide();

	// Click "Preview" to run your code
	$w("#dynamicDataset").onReady( (event) => {

		wixData.query("Blog/Categories")
			.find()
			.then((results) => {
				let categories = results.items;
				let promotionsId = "";
				let currentPromosId = "";

				categories.forEach((item) => {
					if (item.label == "Promotions") {
						promotionsId = item._id;
					}
					else if (item.label == "CurrentPromos") {
						currentPromosId = item._id;
					}
				});

				let baseFilter = wixData.filter().hasSome("categories", [promotionsId]);

				$w("#dynamicDataset").setFilter(baseFilter);

				$w("#showAllPromosButton").onClick(function() {
					// We only want to filter to make sure we retrieve Promotions articles.
					let showAllPromosFilter = baseFilter; 
					$w("#dynamicDataset").setFilter(showAllPromosFilter)
						.then(() => {
							$w("#showAllPromosButton").hide();
							$w("#showCurrentPromosButton").show();
						});
				});

				$w("#showCurrentPromosButton").onClick(function () {
					// If the item isn't hidden and belongs on this parent item, show it.
					let showCurrentPromosFilter = baseFilter.hasSome("categories", [currentPromosId]); 
					$w("#dynamicDataset").setFilter(showCurrentPromosFilter)
						.then(() => {
							$w("#showCurrentPromosButton").hide();
							$w("#showAllPromosButton").show();
						});
				});
			});

		$w("#sortByLastUpdatedDate").onClick(function() {
			// We want to sort by the last updated date.
			let sort = wixData.sort().descending("lastPublishedDate");
			$w("#dynamicDataset").setSort(sort)
				.then(() => {
					$w("#sortByLastUpdatedDate").hide();
					$w("#sortByPublishButton").show();
				});
		});

		$w("#sortByPublishButton").onClick(function () {
			// We want to sort by the publish date.
			let sort = wixData.sort().descending("publishedDate");
			$w("#dynamicDataset").setSort(sort)
				.then(() => {
					$w("#sortByPublishButton").hide();
					$w("#sortByLastUpdatedDate").show();
				});
		});



		$w("#repeater1").onItemReady(($item) => { 
			//$item("#image2").fitMode = "fit";
			//console.log($item("#text16").text);

			// Hide the Updated datetime if it is not newer than the Published datetime. Keep it hidden by default.
			$item("#group3").hide(); 
			
			//let unparsedPublishedDate = $item("#text22").text;
			let publishedDate = Date.parse($item("#text22").text);
			//let unparsedUpdatedDate = $item("#text24").text;
			let updatedDate = Date.parse($item("#text24").text);

			//console.log("Published " + publishedDate + ", Updated " + updatedDate);
			//console.log("Published " + unparsedPublishedDate + ", Updated " + unparsedUpdatedDate);

			// If the updatedDate is later than the publishedDate, show the Updated datetime. Otherwise, hide it.
			if (updatedDate > publishedDate) {
				$item("#group3").show();
				//console.log("Updated datetime shown for " + $item("#text16").text + ".");
			}
			else
			{
				//console.log("Updated datetime hidden for " + $item("#text16").text + ".")
			}
		});
  	});
});