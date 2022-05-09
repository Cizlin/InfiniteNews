/*************************
backend/http-functions.js
*************************

'backend/http-functions.js' is a reserved Velo file that lets you expose APIs that respond to fetch requests from external services.

In this file you create APIs to expose the functionality of your site as a service. That is, other people can use 
the functionality of your site by writing code that calls your site's APIs, as defined by the functions you create here.

Using the provided code (below this comment block) as an example, users of your HTTP functions can call your API using the following patterns: 

Production endpoints:

 • Premium site:
   https://mysite.com/_functions/multiply?leftOperand=3&rightOperand=4
 • Free sites:
   https://username.wixsite.com/mysite/_functions/multiply?leftOperand=3&rightOperand=4

Test endpoints:
 • Premium sites:
   https://mysite.com/_functions-dev/multiply?leftOperand=3&rightOperand=4
 • Free sites:
   https://username.wixsite.com/mysite/_functions-dev/multiply?leftOperand=3&rightOperand=4

---
About HTTP functions: 
https://support.wix.com/en/article/velo-exposing-a-site-api-with-http-functions

API Reference:
https://www.wix.com/velo/reference/wix-http-functions

**********************/

import { ok, serverError } from 'wix-http-functions';

import wixFetch from 'wix-fetch';

import * as ApiConstants from 'public/Constants/ApiConstants.js';

import * as CustomizationFunctions from 'backend/CustomizationAutomationFunctions.jsw';

export async function get_waypointProgressionGuideXoJson(request) {
    // URL looks like: https://www.mysite.com/_functions/myFunction/John/Doe
    let options = {
        "headers": {
            "Content-Type": "application/json"
        }
    };

    let waypointApiHeaders = await CustomizationFunctions.makeWaypointHeaders();

    // query a collection to find matching items
    return await wixFetch.getJSON(ApiConstants.WAYPOINT_URL_GUIDE, { headers: waypointApiHeaders })
        .then((resultJson) => {
            options.body = resultJson
            return ok(options);
        })
        // something went wrong
        .catch((error) => {
            options.body = {
                "error": error
            };
            return serverError(options);
        });
}