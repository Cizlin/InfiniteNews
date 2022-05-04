$w.onReady(function () {
	$w("#dynamicDataset").onReady( (event) => {

		$w("#repeater1").onItemReady(($item) => { 

			// Hide the Updated datetime if it is not newer than the Published datetime. Keep it hidden by default.
			$item("#group1").hide(); 
			
			//let unparsedPublishedDate = $item("#text22").text;
			let publishedDate = Date.parse($item("#text22").text);
			//let unparsedUpdatedDate = $item("#text21").text;
			let updatedDate = Date.parse($item("#text21").text);

			console.log("Published " + publishedDate + ", Updated " + updatedDate);
			//console.log("Published " + unparsedPublishedDate + ", Updated " + unparsedUpdatedDate);

			// If the updatedDate is later than the publishedDate, show the Updated datetime. Otherwise, hide it.
			if (updatedDate > publishedDate) {
				$item("#group1").show();
				//console.log("Updated datetime shown for " + $item("#text16").text + ".");
			}
			else
			{
				console.log("Updated datetime hidden for " + $item("#text16").text + ".")
			}
		});
  	});
});