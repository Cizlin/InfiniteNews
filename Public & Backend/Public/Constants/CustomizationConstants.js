// Filename: public/Constants/CustomizationConstants.js
// Constants used to interact with the Secrets API, Halo Dot API, and the Waypoint API directly.
//#region Constants

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

export const PLACEHOLDER_IMAGE_URL = "wix:image://v1/ee59cf_76d024fd4c2a4cab80bda937a1e1c926~mv2.png/Placeholder%20Image.png#originWidth=275&originHeight=183";

// These constants contain the DB names for several general purpose DBs.
export const QUALITY_DB = "QualityRatings";
export const MANUFACTURER_DB = "Manufacturer";
export const MANUFACTURER_KEY = "Manufacturer";
export const RELEASE_DB = "Releases";
export const SOURCE_TYPE_DB = "Sources";

// These constant define the DB name and key for the Emblem Palette DB.
export const EMBLEM_PALETTE_DB = "EmblemPalettes";
export const EMBLEM_PALETTE_KEY = "Emblem Palette";

// The ITEM_TYPES constant is used to identify which type of item is being processed.
export const ITEM_TYPES = {
	core: "core",
	kit: "kit",
	item: "item",
	attachment: "attachment"
};

// If a customization category has cores, its key will be included in this array.
export const HAS_CORE_ARRAY = [ArmorConstants.ARMOR_KEY, ArmorConstants.ARMOR_ATTACHMENT_KEY, WeaponConstants.WEAPON_KEY, VehicleConstants.VEHICLE_KEY];

// If a customization type is cross-core, it will be included in an array keyed by the customization category.
// Only keys listed in the HAS_CORE_ARRAY should be used here.
// Also, the reason we include Core types themselves is because they aren't sorted into core-specific folders in the media files.
// MOVED TO isCrossCore IN THE * Sockets DB.
/*export const IS_CROSS_CORE_ARRAY_DICT = {
	[KeyConstants.ARMOR_KEY]: [KeyConstants.ARMOR_CORE_KEY, KeyConstants.ARMOR_EMBLEM_KEY, KeyConstants.ARMOR_EFFECT_KEY, KeyConstants.ARMOR_MYTHIC_EFFECT_SET_KEY],
	[KeyConstants.ARMOR_ATTACHMENT_KEY]: [],
	[KeyConstants.WEAPON_KEY]: [KeyConstants.WEAPON_CORE_KEY, KeyConstants.WEAPON_CHARM_KEY, KeyConstants.WEAPON_EMBLEM_KEY, KeyConstants.WEAPON_KILL_EFFECT_KEY],
	[KeyConstants.VEHICLE_KEY]: [KeyConstants.VEHICLE_CORE_KEY, KeyConstants.VEHICLE_EMBLEM_KEY]
}*/

// This dictionary contains the high-level folders for each category within Customization Images.
export const CUSTOMIZATION_CATEGORY_FOLDER_DICT = {
	[ArmorConstants.ARMOR_KEY]: "Armor Customization",
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: "Armor Customization",
	[WeaponConstants.WEAPON_KEY]: "Weapon Customization",
	[VehicleConstants.VEHICLE_KEY]: "Vehicle Customization",
	[BodyAndAiConstants.BODY_AND_AI_KEY]: "Body & AI Customization",
	[SpartanIdConstants.SPARTAN_ID_KEY]: "Spartan ID Customization",
	[ConsumablesConstants.CONSUMABLES_KEY]: "Consumables",
	[EMBLEM_PALETTE_KEY]: "Emblem Palettes",
	[MANUFACTURER_KEY]: "Manufacturer Logos"
}

// This constant dict allows us to pull the URL for an item from its DB JSON.
export const CUSTOMIZATION_CATEGORY_URL_FIELDS = {
	[ArmorConstants.ARMOR_KEY]: "link-armor-customizations-itemName",
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: "link-armor-customization-attachments-itemName",
	[WeaponConstants.WEAPON_KEY]: "link-items-title",
	[VehicleConstants.VEHICLE_KEY]: "link-vehicle-customizations-title",
	[BodyAndAiConstants.BODY_AND_AI_KEY]: "link-body-ai-customizations-itemName-2",
	[SpartanIdConstants.SPARTAN_ID_KEY]: "link-presentation-customizations-title"
}

// This dictionary contains the folders for each customization type within the customization category folders.
// MOVED TO customizationTypeFolder IN THE * Sockets AND * Sections. 
/*export const CUSTOMIZATION_TYPE_FOLDER_DICT = {
	[KeyConstants.ARMOR_KEY]: {
		[KeyConstants.ARMOR_CORE_KEY]: "Armor Cores", // MOVED TO THE Any ITEM
		[KeyConstants.ARMOR_KIT_KEY]: "Armor Kits",
		[KeyConstants.ARMOR_COATING_KEY]: "Armor Coatings",
		[KeyConstants.ARMOR_HELMET_KEY]: "Helmets",
		[KeyConstants.ARMOR_VISOR_KEY]: "Visors",
		[KeyConstants.ARMOR_CHEST_KEY]: "Chests",
		[KeyConstants.ARMOR_LEFT_SHOULDER_PAD_KEY]: "Left Shoulder Pads",
		[KeyConstants.ARMOR_RIGHT_SHOULDER_PAD_KEY]: "Right Shoulder Pads",
		[KeyConstants.ARMOR_GLOVES_KEY]: "Gloves",
		[KeyConstants.ARMOR_WRIST_KEY]: "Wrists",
		[KeyConstants.ARMOR_UTILITY_KEY]: "Utilities",
		[KeyConstants.ARMOR_KNEE_PADS_KEY]: "Knee Pads",
		[KeyConstants.ARMOR_EMBLEM_KEY]: "Armor Emblems",
		[KeyConstants.ARMOR_EFFECT_KEY]: "Armor Effects",
		[KeyConstants.ARMOR_MYTHIC_EFFECT_SET_KEY]: "Mythic Effect Sets"
	},
	[KeyConstants.ARMOR_ATTACHMENT_KEY]: {
		[KeyConstants.ARMOR_HELMET_ATTACHMENT_KEY]: "Armor Attachments"
	},
	[KeyConstants.WEAPON_KEY]: {
		[KeyConstants.WEAPON_CORE_KEY]: "Weapon Cores", // MOVED TO THE Any ITEM
		[KeyConstants.WEAPON_KIT_KEY]: "Weapon Kits",
		[KeyConstants.WEAPON_COATING_KEY]: "Weapon Coatings",
		[KeyConstants.WEAPON_MODEL_KEY]: "Weapon Models",
		[KeyConstants.WEAPON_CHARM_KEY]: "Charms",
		[KeyConstants.WEAPON_EMBLEM_KEY]: "Weapon Emblems",
		[KeyConstants.WEAPON_KILL_EFFECT_KEY]: "Kill Effects"
	},
	[KeyConstants.VEHICLE_KEY]: {
		[KeyConstants.VEHICLE_CORE_KEY]: "Vehicle Cores", // MOVED TO THE Any ITEM
		[KeyConstants.VEHICLE_COATING_KEY]: "Vehicle Coatings",
		[KeyConstants.VEHICLE_MODEL_KEY]: "Vehicle Models",
		[KeyConstants.VEHICLE_EMBLEM_KEY]: "Vehicle Emblems"
	},
	[KeyConstants.BODY_AND_AI_KEY]: {
		[KeyConstants.BODY_AND_AI_MODEL]: "AI Models",
		[KeyConstants.BODY_AND_AI_COLOR]: "AI Colors"
	},
	[KeyConstants.SPARTAN_ID_KEY]: {
		[KeyConstants.SPARTAN_ID_NAMEPLATE_KEY]: "Nameplates",
		[KeyConstants.SPARTAN_ID_BACKDROP_KEY]: "Backdrops",
		[KeyConstants.SPARTAN_ID_STANCE_KEY]: "Stances"
	},
}*/

// MOVED TO waypointId IN * Sockets AND * Sections
/*export const CUSTOMIZATION_WAYPOINT_TO_SITE_KEYS = {
	[KeyConstants.ARMOR_KEY]: {
		"ArmorCore": KeyConstants.ARMOR_CORE_KEY, // MOVED TO Any ITEM
		"ArmorTheme": KeyConstants.ARMOR_KIT_KEY,
		"ArmorCoating": KeyConstants.ARMOR_COATING_KEY,
		"ArmorHelmet": KeyConstants.ARMOR_HELMET_KEY,
		"ArmorVisor": KeyConstants.ARMOR_VISOR_KEY,
		"ArmorChestAttachment": KeyConstants.ARMOR_CHEST_KEY,
		"ArmorLeftShoulderPad": KeyConstants.ARMOR_LEFT_SHOULDER_PAD_KEY,
		"ArmorRightShoulderPad": KeyConstants.ARMOR_RIGHT_SHOULDER_PAD_KEY,
		"ArmorGlove": KeyConstants.ARMOR_GLOVES_KEY,
		"ArmorWristAttachment": KeyConstants.ARMOR_WRIST_KEY,
		"ArmorHipAttachment": KeyConstants.ARMOR_UTILITY_KEY,
		"ArmorKneePad": KeyConstants.ARMOR_KNEE_PADS_KEY,
		"ArmorEmblem": KeyConstants.ARMOR_EMBLEM_KEY,
		"ArmorFx": KeyConstants.ARMOR_EFFECT_KEY,
		"ArmorMythicFx": KeyConstants.ARMOR_MYTHIC_EFFECT_SET_KEY
	},
	[KeyConstants.ARMOR_ATTACHMENT_KEY]: {
		"ArmorHelmetAttachment": KeyConstants.ARMOR_HELMET_ATTACHMENT_KEY
	},
	[KeyConstants.WEAPON_KEY]: {
		"WeaponCore": KeyConstants.WEAPON_CORE_KEY, // MOVED TO Any ITEM
		"WeaponTheme": KeyConstants.WEAPON_KIT_KEY,
		"WeaponCoating": KeyConstants.WEAPON_COATING_KEY,
		"WeaponAlternateGeometryRegion": KeyConstants.WEAPON_MODEL_KEY,
		"WeaponCharm": KeyConstants.WEAPON_CHARM_KEY,
		"WeaponEmblem": KeyConstants.WEAPON_EMBLEM_KEY,
		"WeaponDeathFx": KeyConstants.WEAPON_KILL_EFFECT_KEY
	},
	[KeyConstants.VEHICLE_KEY]: {
		"VehicleCore": KeyConstants.VEHICLE_CORE_KEY, // MOVED TO Any ITEM
		"VehicleCoating": KeyConstants.VEHICLE_COATING_KEY,
		"VehicleAlternateGeometryRegion": KeyConstants.VEHICLE_MODEL_KEY,
		"VehicleEmblem": KeyConstants.VEHICLE_EMBLEM_KEY
	},
	[KeyConstants.BODY_AND_AI_KEY]: {
		"AiModel": KeyConstants.BODY_AND_AI_MODEL,
		"AiColor": KeyConstants.BODY_AND_AI_COLOR
	},
	[KeyConstants.SPARTAN_ID_KEY]: {
		"SpartanEmblem": KeyConstants.SPARTAN_ID_NAMEPLATE_KEY,
		"SpartanBackdropImage": KeyConstants.SPARTAN_ID_BACKDROP_KEY,
		"SpartanActionPose": KeyConstants.SPARTAN_ID_STANCE_KEY
	},
	[KeyConstants.SHOP_KEY]: {
		"Daily": KeyConstants.SHOP_DAILY,
		"Weekly": KeyConstants.SHOP_WEEKLY,
		"": KeyConstants.SHOP_INDEFINITE,
		"HCS": KeyConstants.SHOP_HCS // This needs to be supplied manually when querying this JSON structure. Does not come directly from Waypoint like the others.
	}
}*/

export const CUSTOMIZATION_CATEGORY_SPECIFIC_VARS = {
	[ArmorConstants.ARMOR_KEY]: {
		"SocketDb": ArmorConstants.ARMOR_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": ArmorConstants.ARMOR_CORE_DB,
		"CoreNameField": "name",
		"CustomizationDb": ArmorConstants.ARMOR_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": ArmorConstants.ARMOR_SOCKET_REFERENCE_FIELD,
		"CustomizationCoreReferenceField": ArmorConstants.ARMOR_CORE_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"CustomizationAttachmentReferenceField": "ArmorCustomizationAttachments",
		"CustomizationKitItemReferenceField": "adi4LightHalfMiddleTitles",
		"CustomizationKitAttachmentReferenceField": "ArmorCustomizationAttachments-1",
		"EmblemPaletteReferenceField": "emblemPalettes"
	},

	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: {
		"SocketDb": ArmorConstants.ARMOR_ATTACHMENT_SOCKET_DB,
		"SocketNameField": "name",
		"CustomizationDb": ArmorConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_DB,
		"CustomizationNameField": "itemName",
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"ParentKey": ArmorConstants.ARMOR_KEY
	},

	[WeaponConstants.WEAPON_KEY]: {
		"SocketDb": WeaponConstants.WEAPON_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": WeaponConstants.WEAPON_CORE_DB,
		"CoreNameField": "name",
		"CustomizationDb": WeaponConstants.WEAPON_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": WeaponConstants.WEAPON_SOCKET_REFERENCE_FIELD,
		"CustomizationCoreReferenceField": WeaponConstants.WEAPON_CORE_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"CustomizationKitItemReferenceField": "Items",
		"EmblemPaletteReferenceField": "emblemPalettes"
	},

	[VehicleConstants.VEHICLE_KEY]: {
		"SocketDb": VehicleConstants.VEHICLE_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": VehicleConstants.VEHICLE_CORE_DB,
		"CoreNameField": "name",
		"CustomizationDb": VehicleConstants.VEHICLE_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": VehicleConstants.VEHICLE_SOCKET_REFERENCE_FIELD,
		"CustomizationCoreReferenceField": VehicleConstants.VEHICLE_CORE_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"EmblemPaletteReferenceField": "emblemPalettes"
	},

	[BodyAndAiConstants.BODY_AND_AI_KEY]: {
		"SocketDb": BodyAndAiConstants.BODY_AND_AI_SOCKET_DB,
		"SocketNameField": "name",
		"CustomizationDb": BodyAndAiConstants.BODY_AND_AI_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": BodyAndAiConstants.BODY_AND_AI_SOCKET_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source"
	},

	[SpartanIdConstants.SPARTAN_ID_KEY]: {
		"SocketDb": SpartanIdConstants.SPARTAN_ID_SOCKET_DB,
		"SocketNameField": "name",
		"CustomizationDb": SpartanIdConstants.SPARTAN_ID_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": SpartanIdConstants.SPARTAN_ID_SOCKET_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"EmblemPaletteReferenceField": "emblemPalettes"
	}
};

export const CORE_CATEGORY_SPECIFIC_VARS = {
	[ArmorConstants.ARMOR_KEY]: {
		"SocketDb": ArmorConstants.ARMOR_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": ArmorConstants.ARMOR_CORE_DB,
		"CoreNameField": "name",
		"CoreImageField": "image",
		"CoreQualityReferenceField": "qualityReference",
		"CoreLoreField": "lore",
		"CoreManufacturerReferenceField": "manufacturerReference",
		"CoreReleaseReferenceField": "releaseReference",
		"CoreSourceField": "source"
	},

	[WeaponConstants.WEAPON_KEY]: {
		"SocketDb": WeaponConstants.WEAPON_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": WeaponConstants.WEAPON_CORE_DB,
		"CoreNameField": "name",
		"CoreImageField": "image",
		"CoreQualityReferenceField": "qualityReference",
		"CoreLoreField": "lore",
		"CoreManufacturerReferenceField": "manufacturerReference",
		"CoreReleaseReferenceField": "releaseReference",
		"CoreSourceField": "source"
	},

	[VehicleConstants.VEHICLE_KEY]: {
		"SocketDb": VehicleConstants.VEHICLE_SOCKET_DB,
		"SocketNameField": "name",
		"CoreDb": VehicleConstants.VEHICLE_CORE_DB,
		"CoreNameField": "name",
		"CoreImageField": "image",
		"CoreQualityReferenceField": "qualityReference",
		"CoreLoreField": "lore",
		"CoreManufacturerReferenceField": "manufacturerReference",
		"CoreReleaseReferenceField": "releaseReference",
		"CoreSourceField": "source"
	}
};

// This is a bit special since we also have a true/false value telling whether the customization group type has attachments or not.
// MOVED TO waypointField AND hasAttachments IN * Sockets AND * Sections
/*export const CUSTOMIZATION_WAYPOINT_GROUP_TYPES = {
	[KeyConstants.ARMOR_KEY]: {
		"Coatings": false,
		"Helmets": true,
		"Visors": false,
		"LeftShoulderPads": false,
		"RightShoulderPads": false,
		"Gloves": false,
		"KneePads": false,
		"ChestAttachments": false,
		"WristAttachments": false,
		"HipAttachments": false,
		"Emblems": false,
		"ArmorFx": false,
		"MythicFx": false
	},
	[KeyConstants.WEAPON_KEY]: {
		"Coatings": false,
		"StatTrackers": false,
		"WeaponCharms": false,
		"AmmoCounterColors": false,
		"DeathFx": false,
		"Emblems": false,
		"AlternateGeometryRegions": false
	},
	[KeyConstants.VEHICLE_KEY]: {
		"Coatings": false,
		"Emblems": false,
		"VehicleFx": false,
		"VehicleCharms": false,
		"Horns": false,
		"AlternateGeometryRegions": false
	},
	[KeyConstants.BODY_AND_AI_KEY]: {
		"Models": false,
		"Colors": false
	}
};

export const CUSTOMIZATION_WAYPOINT_GROUP_TYPE_TO_WAYPOINT_TYPE = {
	[KeyConstants.ARMOR_KEY]: {
		"Coatings": "ArmorCoating",
		"Helmets": "ArmorHelmet",
		"Visors": "ArmorVisor",
		"LeftShoulderPads": "ArmorLeftShoulderPad",
		"RightShoulderPads": "ArmorRightShoulderPad",
		"Gloves": "ArmorGlove",
		"KneePads": "ArmorKneePad",
		"ChestAttachments": "ArmorChestAttachment",
		"WristAttachments": "ArmorWristAttachment",
		"HipAttachments": "ArmorHipAttachment",
		"Emblems": "ArmorEmblem",
		"ArmorFx": "ArmorFx",
		"MythicFx": "ArmorMythicFx"
	},
	[KeyConstants.WEAPON_KEY]: {
		"Coatings": "WeaponCoating",
		"StatTrackers": "WeaponStatTracker",
		"WeaponCharms": "WeaponCharm",
		"AmmoCounterColors": "WeaponAmmoCounterColor",
		"DeathFx": "WeaponDeathFx",
		"Emblems": "WeaponEmblem",
		"AlternateGeometryRegions": "WeaponAlternateGeometryRegion"
	},
	[KeyConstants.VEHICLE_KEY]: {
		"Coatings": "VehicleCoating",
		"Emblems": "VehicleEmblem",
		"VehicleFx": "VehicleFx",
		"VehicleCharms": "VehicleCharm",
		"Horns": "VehicleHorn",
		"AlternateGeometryRegions": "VehicleAlternateGeometryRegion"
	},
	[KeyConstants.BODY_AND_AI_KEY]: {
		"Models": "AiModel",
		"Colors": "AiColor"
	}
};*/

// If a Customization Category has a type with attachments, it can be referenced here.
export const CUSTOMIZATION_TYPES_WITH_ATTACHMENTS = {
	[ArmorConstants.ARMOR_KEY]: [ArmorConstants.ARMOR_HELMET_KEY]
};

// If a Customization Category features Kits, it will be listed here.

export const CUSTOMIZATION_TYPES_WITH_KITS = {
	[ArmorConstants.ARMOR_KEY]: [ArmorConstants.ARMOR_KIT_KEY],
	[WeaponConstants.WEAPON_KEY]: [WeaponConstants.WEAPON_KIT_KEY]
};
//#endregion