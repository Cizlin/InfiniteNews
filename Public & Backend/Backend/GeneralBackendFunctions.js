import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

import wixData from 'wix-data';

// The type dictionary will be of the form:
/*
{
    [ArmorConstants.ARMOR_KEY]: armorTypeWaypointIdArray,
    [WeaponConstants.WEAPON_KEY]: weaponTypeWaypointIdArray,
    ...
}
*/
export async function generateTypeDict(includeCores = false) { // If includeCores is true, we manually add the core WaypointIds.
    let typeDict = {}

    for (let i = 0; i < CustomizationConstants.IS_CUSTOMIZATION_ARRAY.length; ++i) {
        let category = CustomizationConstants.IS_CUSTOMIZATION_ARRAY[i];
        let retry = true;
        let retryCount = 0;
        const MAX_RETRIES = 10;

        const WAYPOINT_ID_FIELD = CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SocketWaypointIdField;

        while (retry && retryCount < MAX_RETRIES) {
            typeDict[category] = await wixData.query(CustomizationConstants.CUSTOMIZATION_CATEGORY_SPECIFIC_VARS[category].SocketDb)
                .ne(WAYPOINT_ID_FIELD, "N/A") // Don't include N/A in this.
                .find()
                .then((results) => {
                    retry = false;

                    let waypointIdArray = [];

                    results.items.forEach((type) => {
                        waypointIdArray.push(type[WAYPOINT_ID_FIELD]);
                    });

                    if (includeCores && category in CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT) {
                        waypointIdArray.push(CustomizationConstants.CATEGORY_TO_CORE_WAYPOINT_ID_DICT[category]);
                    }

                    return waypointIdArray;
                })
                .catch((error) => {
                    console.error(error + " occurred while fetching list of customization types for " + category + "." +
                        ((retry) ? ("Try " + (++retryCount) + " of " + MAX_RETRIES + "...") : ""));
                    return -1;
                });
        }

        if (retry) { // If we exceeded the max number of retries.
            throw "Unable to get list of customization types from DB. Exiting...";
        }
    }

    return typeDict;
}