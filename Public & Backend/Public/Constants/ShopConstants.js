// Filename: public/Constants/CustomizationConstants.js
// Constants used to manage the Shop DBs.
//#region Constants

// These constants define the Shop Listings section.
export const SHOP_KEY = "Shop";
export const SHOP_LISTINGS_SECTION = "Shop Listings";
export const SHOP_DB = "ShopListings";

export const SHOP_ARMOR_REFERENCE_FIELD = "armorItems";
export const SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD = "armorAttachmentItems";
export const SHOP_WEAPON_REFERENCE_FIELD = "weaponItems";
export const SHOP_VEHICLE_REFERENCE_FIELD = "vehicleItems";
export const SHOP_BODY_AND_AI_REFERENCE_FIELD = "bodyAiItems";
export const SHOP_SPARTAN_ID_REFERENCE_FIELD = "spartanIdItems";
export const SHOP_CONSUMABLE_REFERENCE_FIELD = "consumables";

export const SHOP_DAILY = "Daily";
export const SHOP_WEEKLY = "Weekly";
export const SHOP_INDEFINITE = "Indefinite";
export const SHOP_HCS = "HCS";

export const SHOP_FOLDER = "Shop";

// This dictionary contains the folders for each Shop type within the /Customization Images/Shop/ folder.
export const SHOP_TYPE_FOLDER_DICT = {
	[SHOP_DAILY]: "Daily",
	[SHOP_WEEKLY]: "Weekly",
	[SHOP_INDEFINITE]: "Indefinite",
	[SHOP_HCS]: "HCS"
}

// This dictionary converts Waypoint Shop types to ones recognized by the site.
export const SHOP_WAYPOINT_TO_SITE_TYPE_DICT = {
	"Daily": KeyConstants.SHOP_DAILY,
	"Weekly": KeyConstants.SHOP_WEEKLY,
	"": KeyConstants.SHOP_INDEFINITE,
	"HCS": KeyConstants.SHOP_HCS // This needs to be supplied manually when querying this JSON structure. Does not come directly from Waypoint like the others.
}
//#endregion