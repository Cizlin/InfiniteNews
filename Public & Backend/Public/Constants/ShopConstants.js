// Filename: public/Constants/ShopConstants.js

// These constants define the Shop Listings section.
export const SHOP_KEY = "Shop";
export const SHOP_LISTINGS_SECTION = "Shop Listings";
export const SHOP_DB = "ShopListings";

export const SHOP_ITEM_NAME_FIELD = "itemName";
export const SHOP_CURRENTLY_AVAILABLE_FIELD = "currentlyAvailable";
export const SHOP_AVAILABLE_THROUGH_CUSTOMIZATION_FIELD = "availableThroughCustomization";
export const SHOP_FIELDS_WITH_ITEMS_FIELD = "fieldsWithItems";
export const SHOP_TIME_TYPE_FIELD = "timeType";
export const SHOP_DESCRIPTION_FIELD = "description";
export const SHOP_WAYPOINT_ID_FIELD = "waypointId";
export const SHOP_LAST_AVAILABLE_DATETIME_FIELD = "lastAvailableDatetime";
export const SHOP_IS_HCS_FIELD = "isHcs";
export const SHOP_COST_CREDITS_FIELD = "costCredits";
export const SHOP_BUNDLE_IMAGE_FIELD = "bundleImage";
export const SHOP_AVAILABLE_DATE_ARRAY_FIELD = "availableDateArray";
export const SHOP_PRICE_HISTORY_ARRAY_FIELD = "priceHistoryArray";

export const SHOP_URL_FIELD = "link-shop-listings-itemName";
export const SHOP_LISTINGS_URL_SUFFIX = "/shop-listings";

export const SHOP_IMAGE_ETAG_FIELD = "imageETag";

export const SHOP_NUMBER_OF_CHALLENGE_SWAPS_FIELD = "numberOfChallengeSwaps";
export const SHOP_NUMBER_OF_XP_BOOSTS_FIELD = "numberOfXpBoosts";
export const SHOP_NUMBER_OF_XP_GRANTS_FIELD = "numberOfXpGrants";
export const SHOP_NUMBER_OF_CREDITS_FIELD = "numberOfCredits";

export const SHOP_QUALITY_REFERENCE_FIELD = "qualityReference";

export const SHOP_ARMOR_REFERENCE_FIELD = "armorItems";
export const SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD = "armorAttachmentItems";
export const SHOP_WEAPON_REFERENCE_FIELD = "weaponItems";
export const SHOP_VEHICLE_REFERENCE_FIELD = "vehicleItems";
export const SHOP_BODY_AND_AI_REFERENCE_FIELD = "bodyAiItems";
export const SHOP_SPARTAN_ID_REFERENCE_FIELD = "spartanIdItems";
export const SHOP_CONSUMABLE_REFERENCE_FIELD = "consumables";

export const SHOP_DAILY = "Daily";
export const SHOP_WEEKLY = "Weekly";
export const SHOP_SEMI_WEEKLY = "Semi-Weekly";
export const SHOP_INDEFINITE = "Indefinite";
export const SHOP_HCS = "HCS";
export const SHOP_CUSTOMIZATION_MENU = "Customization Menu";

export const SHOP_FOLDER = "Shop";

// This dictionary converts Waypoint Shop types to ones recognized by the site. This is likely no longer in use.
export const SHOP_WAYPOINT_TO_SITE_TYPE_DICT = {
	"DAILY": SHOP_DAILY,
	"WEEKLY": SHOP_WEEKLY,
	"EVENT": SHOP_SEMI_WEEKLY,
	"": SHOP_INDEFINITE,
	"HCS": SHOP_HCS // This needs to be supplied manually when querying this JSON structure. Does not come directly from Waypoint like the others.
}
