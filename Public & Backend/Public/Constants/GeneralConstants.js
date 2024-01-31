// Filename: public/Constants/GeneralConstants.js

// Extracting the Waypoint ID from a path.
export const REGEX_WAYPOINT_ID_FROM_PATH = /\d[^.]+/;

// Extracting the final characters from a Waypoint ID after the last -.
export const REGEX_FINAL_CHARS_FROM_WAYPOINT_ID = /-(\w+)$/;
export const REGEX_FIRST_CHARS_FROM_NEW_WAYPOINT_ID = /^(\d{7})-/;

// The base for all haloinfinitenews.com URLs.
export const INFINITE_NEWS_URL_BASE = "https://www.haloinfinitenews.com";

// These constants define URL slugs and parameters for Armor Customization.
export const URL_ARMOR_CUSTOMIZATION = "/armor-customizations";
export const URL_ARMOR_SOCKETS = "/armor-sockets";
export const URL_ARMOR_CORE_PARAM = "armorCore";
export const URL_ARMOR_SOCKET_PARAM = "armorSocket";

// These constants define URL slugs and parameters for Armor Attachment Customization.
export const URL_ARMOR_ATTACHMENT_CUSTOMIZATION = "/armor-customizations/attachments";
export const URL_ARMOR_ATTACHMENT_SOCKET_PARAM = "armorAttachmentSocket";

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
export const FILE_DICT_RETURNED_FILES_LIMIT = 100;

// The limit to the number of folders returned by the listFolders() function when assembling the file dictionary.
export const FILE_DICT_RETURNED_FOLDERS_LIMIT = 100;

// The root folder for Customization Images.
export const CUSTOMIZATION_ROOT_FOLDER = "Customization Images";
export const EMBLEM_PALETTE_ROOT_FOLDER = "Emblem Palettes";
export const SHOP_ROOT_FOLDER = "Shop";
export const ARMOR_ROOT_FOLDER = "Armor Customization";
export const WEAPON_ROOT_FOLDER = "Weapon Customization";
export const VEHICLE_ROOT_FOLDER = "Vehicle Customization";
export const BODY_AND_AI_ROOT_FOLDER = "Body & AI Customization";
export const SPARTAN_ID_ROOT_FOLDER = "Spartan ID Customization";
