// The code in this file will load on every page of your site
import wixWindow from 'wix-window';
import {session} from 'wix-storage';
import wixLocation from 'wix-location';
import {paginationKey, setPaginationIndexFromSave} from 'public/Pagination.js';
import {stackKey, stackLimit, Stack} from 'public/Stack.js';

let previousPageURL;

$w.onReady(function () {
    // Store the page in the page stack by retrieving the stack string from the session data, converting it to a Stack object, and pushing the page onto the stack.
    // Then, save the stack.
    let pageStackString = session.getItem(stackKey);
    let pageStack = new Stack(stackLimit);
    pageStack.loadFromString(pageStackString);

    // Loading stored pagestack.
    console.log("Stack loaded.");

	// Set the back button to go to the previous page only if it exists.
    //console.log($w("#backButton").type);
    if ($w("#backButton").type == "$w.Button") {
        console.log("Setting up back button...");
        // We don't want to go back to the same page, so while the top item is the same url, we need to pop.
        while (pageStack.peek() == wixLocation.url) {
            pageStack.pop();
        }

        previousPageURL = pageStack.peek();
        //console.log(previousPageURL);
        // Hide the back button if there's no page to go back to. Otherwise show it.
        if (previousPageURL == null)
        {
            console.log("Hiding back button...");
            $w("#backButton").hide();
        }
        else
        {
            console.log("Showing back button...");

            // Sometimes the button disappears when it should appear. Hiding it and showing it seems to fix this issue.
            $w("#backButton").hide();
            $w("#backButton").show();
            //console.log("Back Button shown: " + $w("#backButton").isVisible);

            $w("#backButton").link = previousPageURL;
            $w("#backButton").target = "_self";
            console.log("Back Button link: " + $w("#backButton").link);
            $w("#backButton").onClick( (event) => {
                // If the button is clicked, we need to pop off the current page and the previous page from the stack before going back to the previous page.
                let pageStackStringButton = session.getItem(stackKey);
                var pageStackButton = new Stack(stackLimit);
                pageStackButton.loadFromString(pageStackStringButton);

                //console.log("Page stack prior to button press: " + pageStackButton.printStack());
                pageStackButton.pop();
                pageStackButton.pop();
                //console.log("Page stack after button press: " + pageStackButton.printStack());

                session.setItem(stackKey, pageStackButton.printStack());
                wixLocation.to($w("#backButton").link);
            });
        }
    }

    // Push the current page onto the stack now that the button has been set up. Only do so if the current page isn't on the top already.
    if (pageStack.peek() != wixLocation.url) {
        console.log("Top pageStack value: " + pageStack.peek());
        console.log("Page URL: " + wixLocation.url);
        pageStack.push(wixLocation.url);
        session.setItem(stackKey, pageStack.printStack());
    }

    console.log("Stack setup completed.");
    //console.log("Current contents: " + pageStack.printStack());

    // Set pagination page to the saved value for this webpage.
    console.log(($w("#dynamicDataset").type));
    if ($w("#dynamicDataset").type == "dataset" || $w("#dynamicDataset").type == "router_dataset") {
        console.log("Dynamic Dataset is on this page. Setting pagination index from save on ready.");
        $w("#dynamicDataset").onReady(setPaginationIndexFromSave);
    } else {
        console.log("Dynamic Dataset is not on this page.");
    }

    //console.log(($w("#pagination1").type));
    // Save the pagination value anytime it changes.
    if ($w("#pagination1").type == "$w.Pagination") {
        console.log("Pagination is on this page. Configuring to update session data and scroll on change.");
        $w("#pagination1").onChange((event) => {
                session.setItem(paginationKey, event.target.currentPage);
                //console.log("Pagination page " + event.target.currentPage + " saved to session data under pagination key " + paginationKey + ".");

                // Scroll back to top of page when page is changed. Do not use an animation to speed things up.
                wixWindow.scrollTo(0, 0, {"scrollAnimation": false});
        });
    } else {
        console.log("Default pagination is not on this page.");
    }
    //console.log("Back Button shown: " + $w("#backButton").isVisible);
});