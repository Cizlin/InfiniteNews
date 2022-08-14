// Filename: public/Constants/PassConstants.js

// These constants are used for the Battle/Event Passes.
export const PASS_KEY = "Pass";
export const PASSES_SECTION = "Passes";
export const PASS_DB = "Passes";
export const PASS_RANK_DB = "PassRanks";

export const PASS_TITLE_FIELD = "title";
export const PASS_WAYPOINT_ID_FIELD = "waypointId";
export const PASS_IS_EVENT_FIELD = "isEvent";
export const PASS_IMAGE_FIELD = "image";
export const PASS_DESCRIPTION_FIELD = "description";
export const PASS_DATE_RANGE_TEXT_FIELD = "dateRangeText";
export const PASS_CURRENTLY_AVAILABLE_FIELD = "currentlyAvailable";
export const PASS_SEASON_FIELD = "season";
export const PASS_IMAGE_ETAG_FIELD = "imageETag";
export const PASS_ETAG_FIELD = "passETag";

export const PASS_DATE_RANGE_ARRAY_FIELD = "dateRangeArray";
export const PASS_DATE_RANGE_ARRAY_START_DATE_FIELD = "startDate";
export const PASS_DATE_RANGE_ARRAY_END_DATE_FIELD = "endDate";

export const PASS_URL_FIELD = "link-passes-title";

export const PASS_RANK_IS_PREMIUM_FIELD = "isPremium";
export const PASS_RANK_RANK_FIELD = "rank";
export const PASS_RANK_RANK_NUM_FIELD = "rankNum";
export const PASS_RANK_PARENT_PASS_FIELD = "parentPass";
export const PASS_RANK_FIELDS_WITH_ITEMS_FIELD = "fieldsWithItems";

export const PASS_RANK_NUMBER_OF_CHALLENGE_SWAPS_FIELD = "numberOfChallengeSwaps";
export const PASS_RANK_NUMBER_OF_XP_BOOSTS_FIELD = "numberOfXpBoosts";
export const PASS_RANK_NUMBER_OF_XP_GRANTS_FIELD = "numberOfXpGrants";
export const PASS_RANK_NUMBER_OF_CREDITS_FIELD = "numberOfCredits";

export const PASS_BATTLE = "Battle Pass";
export const PASS_EVENT = "Event Pass";

export const PASS_RANK_ARMOR_REFERENCE_FIELD = "armorItems";
export const PASS_RANK_ARMOR_ATTACHMENT_REFERENCE_FIELD = "armorAttachmentItems";
export const PASS_RANK_WEAPON_REFERENCE_FIELD = "weaponItems";
export const PASS_RANK_VEHICLE_REFERENCE_FIELD = "vehicleItems";
export const PASS_RANK_BODY_AND_AI_REFERENCE_FIELD = "bodyAiItems";
export const PASS_RANK_SPARTAN_ID_REFERENCE_FIELD = "spartanIdItems";
export const PASS_RANK_CONSUMABLE_REFERENCE_FIELD = "consumables";
export const PASS_RANK_ARMOR_CORE_REFERENCE_FIELD = "armorCores";
export const PASS_RANK_WEAPON_CORE_REFERENCE_FIELD = "weaponCores";
export const PASS_RANK_VEHICLE_CORE_REFERENCE_FIELD = "vehicleCores";

export const PASS_FOLDER = "Passes";

// This dictionary contains the folders for each Pass type within the /Customization Images/Passes/ folder.
export const PASS_TYPE_FOLDER_DICT = {
	[PASS_BATTLE]: "Battle Passes",
	[PASS_EVENT]: "Event Passes"
};

export const PASS_RANK_ITEM_FIELD_ARRAY = [
	PASS_RANK_ARMOR_REFERENCE_FIELD,
	PASS_RANK_ARMOR_CORE_REFERENCE_FIELD,
	PASS_RANK_ARMOR_ATTACHMENT_REFERENCE_FIELD,
	PASS_RANK_WEAPON_REFERENCE_FIELD,
	PASS_RANK_WEAPON_CORE_REFERENCE_FIELD,
	PASS_RANK_VEHICLE_REFERENCE_FIELD,
	PASS_RANK_VEHICLE_CORE_REFERENCE_FIELD,
	PASS_RANK_BODY_AND_AI_REFERENCE_FIELD,
	PASS_RANK_SPARTAN_ID_REFERENCE_FIELD,
	PASS_RANK_CONSUMABLE_REFERENCE_FIELD
];
