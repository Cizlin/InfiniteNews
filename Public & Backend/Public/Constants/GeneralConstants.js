// Filename: public/Constants/GeneralConstants.js
// Constants used within general helper functions.

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

// Extracting the Waypoint ID from a path.
export const REGEX_WAYPOINT_ID_FROM_PATH = /\d[^.]+/;

// The base for all haloinfinitenews.com URLs.
export const INFINITE_NEWS_URL_BASE = "https://www.haloinfinitenews.com";

// These constants define URL slugs and parameters for Armor Customization.
export const URL_ARMOR_CUSTOMIZATION = "/armor-customizations";
export const URL_ARMOR_SOCKETS = "/armor-sockets";
export const URL_ARMOR_CORE_PARAM = "armorCore";
export const URL_ARMOR_SOCKET_PARAM = "armorSocket";

// These constants define URL slugs and parameters for Weapon Customization.
export const URL_WEAPON_CUSTOMIZATION = "/weapon-customizations";
export const URL_WEAPON_SOCKETS = "/weapon-sockets";
export const URL_WEAPON_CORE_PARAM = "weaponCore";
export const URL_WEAPON_SOCKET_PARAM = "weaponSocket";

// These constants define URL slugs and parameters for Vehicle Customization.
export const URL_VEHICLE_CUSTOMIZATION = "/vehicle-customizations";
export const URL_VEHICLE_SOCKETS = "/vehicle-sockets";
export const URL_VEHICLE_CORE_PARAM = "vehicleCore";
export const URL_VEHICLE_SOCKET_PARAM = "vehicleSocket";

// These constants define URL slugs and parameters for Body & AI Customization.
export const URL_BODY_AND_AI_CUSTOMIZATION = "/body-and-ai-customizations";
export const URL_BODY_AND_AI_SOCKET_PARAM = "bodyAndAISocket";

// These constants define URL slugs and parameters for Spartan ID Customization.
export const URL_SPARTAN_ID_CUSTOMIZATION = "/spartan-id-customizations";
export const URL_SPARTAN_ID_SOCKET_PARAM = "spartanIDSocket";

// The limit to the number of files returned by the listFiles() function when assembling the file dictionary.
export const FILE_DICT_RETURNED_FILES_LIMIT = 500;

// The root folder for Customization Images.
export const CUSTOMIZATION_ROOT_FOLDER = "Customization Images";