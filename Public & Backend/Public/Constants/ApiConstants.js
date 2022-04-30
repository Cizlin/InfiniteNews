// Filename: public/Constants/ApiConstants.js
// Constants used to interact with the Secrets API, Halo Dot API, and the Waypoint API directly.
export const API_URL_BASE = "https://cryptum.halodotapi.com";
export const API_VERSION = "2.3-alpha";

export const SECRETS_XUID_KEY = "Xuid";
export const SECRETS_SPARTAN_TOKEN_KEY = "SpartanToken";
export const SECRETS_API_KEY = "HaloDotAPIKey";

export const WAYPOINT_URL_BASE_PROGRESSION = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/Progression/file/";
export const WAYPOINT_URL_BASE_IMAGE = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/images/file/";
export const WAYPOINT_URL_BASE_WAYPOINT = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/waypoint/file/";
export const WAYPOINT_URL_BASE_ECONOMY = "https://economy.svc.halowaypoint.com/hi/players/";

// Use with PROGRESSION base.
export const WAYPOINT_URL_SUFFIX_PROGRESSION_INVENTORY_CATALOG = "inventory/catalog/inventory_catalog.json";

// Use with WAYPOINT base.
export const WAYPOINT_URL_SUFFIX_WAYPOINT_ARMOR_CORE_LIST = "armor-core-list.json";

// Use with ECONOMY base.
export const WAYPOINT_URL_XUID_PREFIX = "xuid(";
export const WAYPOINT_URL_XUID_SUFFIX = ")/";
export const WAYPOINT_URL_SUFFIX_ECONOMY_INVENTORY = "inventory";

export const WAYPOINT_URL_GUIDE = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/Progression/guide/xo";

export const WAYPOINT_SPARTAN_TOKEN_HEADER = "X-343-Authorization-Spartan";
export const WAYPOINT_343_CLEARANCE_HEADER = "343-Clearance";