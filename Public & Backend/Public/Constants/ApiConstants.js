// Filename: public/Constants/ApiConstants.js
// Constants used to interact with the Secrets API, Halo Dot API, and the Waypoint API directly.
export const API_URL_BASE = "https://cryptum.halodotapi.com";
export const API_VERSION = "2.3-alpha";

export const SECRETS_XUID_KEY = "Xuid";
export const SECRETS_SPARTAN_TOKEN_KEY = "SpartanToken";
export const SECRETS_API_KEY = "HaloDotAPIKey";
export const SECRETS_AZURE_CLIENT_ID_KEY = "AzureClientId";
export const SECRETS_AZURE_CLIENT_SECRET_KEY = "AzureClientSecret";

export const SECRETS_XSTS_TOKEN_KEY = "XstsToken";
export const SECRETS_USER_TOKEN_KEY = "UserToken";
export const SECRETS_ACCESS_TOKEN_KEY = "AccessToken";
export const SECRETS_REFRESH_TOKEN_KEY = "RefreshToken";
export const SECRETS_AUTHORIZATION_CODE_KEY = "AuthorizationCode";

export const AZURE_REDIRECT_URI = "https://localhost"; // We need to manually convert the :// to %3a%2f%2f in URL params.

export const XBOX_LIVE_AUTHORIZATION_BASE = "https://login.live.com/oauth20_authorize.srf";
export const XBOX_LIVE_TOKEN_BASE = "https://login.live.com/oauth20_token.srf";
export const XBOX_LIVE_USER_AUTHENTICATE_BASE = "https://user.auth.xboxlive.com/user/authenticate";
export const XBOX_LIVE_XSTS_BASE = "https://xsts.auth.xboxlive.com/xsts/authorize";

export const XBOX_LIVE_AUTH_RELYING_PARTY = "http://auth.xboxlive.com";
export const XBOX_LIVE_USER_TOKEN_TYPE = "JWT";
export const XBOX_LIVE_AUTH_METHOD = "RPS";
export const XBOX_LIVE_AUTH_SITE_NAME = "user.auth.xboxlive.com";

export const WAYPOINT_RELYING_PARTY = "https://prod.xsts.halowaypoint.com/";
export const XBOX_LIVE_RELYING_PARTY = "http://xboxlive.com";

export const WAYPOINT_AUTH_AUDIENCE = "urn:343:s3:services";
export const WAYPOINT_AUTH_MIN_VERSION = "4";
export const WAYPOINT_AUTH_XSTS_TOKEN_TYPE = "Xbox_XSTSv3";
export const WAYPOINT_AUTH_SPARTAN_TOKEN_BASE = "https://settings.svc.halowaypoint.com/spartan-token";

export const WAYPOINT_USER_AGENT_HEADER = "HaloWaypoint/2021112313511900 CFNetwork/1327.0.4 Darwin/21.2.0";

export const WAYPOINT_URL_BASE_343_CLEARANCE = "https://settings.svc.halowaypoint.com/oban/flight-configurations/titles/hi/audiences/retail/players/"
export const WAYPOINT_URL_SUFFIX_343_CLEARANCE_FLIGHT = "active";

export const WAYPOINT_URL_BASE_PROGRESSION = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/Progression/file/";
export const WAYPOINT_URL_BASE_IMAGE = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/images/file/";
export const WAYPOINT_URL_BASE_WAYPOINT = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/waypoint/file/";
export const WAYPOINT_URL_BASE_ECONOMY = "https://economy.svc.halowaypoint.com/hi/players/";
export const WAYPOINT_URL_BASE_HALOSTATS = "https://halostats.svc.halowaypoint.com/hi/players/"; // Don't use 343 Clearance with this URL.

// Use with PROGRESSION base.
export const WAYPOINT_URL_SUFFIX_PROGRESSION_INVENTORY_CATALOG = "inventory/catalog/inventory_catalog.json";
export const WAYPOINT_URL_SUFFIX_PROGRESSION_METADATA = "Metadata/Metadata.json";
export const WAYPOINT_URL_SUFFIX_PROGRESSION_SEASON_CALENDAR = "/Calendars/Seasons/SeasonCalendar.json";

// Use with WAYPOINT base.
export const WAYPOINT_URL_SUFFIX_WAYPOINT_ARMOR_CORE_LIST = "armor-core-list.json";
export const WAYPOINT_URL_SUFFIX_WAYPOINT_EMBLEM_MAPPING = "images/emblems/mapping.json";

// Use with ECONOMY base.
export const WAYPOINT_URL_SUFFIX_ECONOMY_INVENTORY = "inventory";
export const WAYPOINT_URL_SUFFIX_ECONOMY_STORE_MAIN = "stores/Main";
export const WAYPOINT_URL_SUFFIX_ECONOMY_STORE_HCS = "stores/Hcs";

// Use with HALOSTATS base.
export const WAYPOINT_URL_SUFFIX_HALOSTATS_DECKS = "decks";

export const WAYPOINT_URL_XUID_PREFIX = "xuid(";
export const WAYPOINT_URL_XUID_SUFFIX = ")/";

export const WAYPOINT_URL_GUIDE = "https://gamecms-hacs-origin.svc.halowaypoint.com/hi/Progression/guide/xo";

export const WAYPOINT_SPARTAN_TOKEN_HEADER = "X-343-Authorization-Spartan";
export const WAYPOINT_343_CLEARANCE_HEADER = "343-Clearance";
