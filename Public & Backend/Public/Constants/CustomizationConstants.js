// Filename: public/Constants/CustomizationConstants.js
// Constants used within the Customization Import

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';

import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';

// File system constants.
export const PLACEHOLDER_IMAGE_URL = "wix:image://v1/ee59cf_76d024fd4c2a4cab80bda937a1e1c926~mv2.png/Placeholder%20Image.png#originWidth=275&originHeight=183";

// These constants contain the DB names for several general purpose DBs.
export const QUALITY_DB = "QualityRatings";
export const QUALITY_FIELD = "quality";

export const MANUFACTURER_DB = "Manufacturer";
export const MANUFACTURER_FIELD = "manufacturer";
export const MANUFACTURER_IMAGE_FIELD = "image";
export const MANUFACTURER_KEY = "Manufacturer";

export const RELEASE_DB = "Releases";

// Normally we wouldn't want to include DB IDs in these config files, but in this case, it's for performance.
export const SOURCE_TYPE_DB = "Sources";
export const SOURCE_TYPE_NAME_FIELD = "name";
export const SOURCE_TYPE_PENDING = "(Pending)"; // The name of the (Pending) Source Type.
export const SOURCE_TYPE_PENDING_ID = "682d9532-14a9-4f27-9454-6c0d2275a4f4"; 
export const SOURCE_TYPE_SHOP = "Shop";
export const SOURCE_TYPE_SHOP_ID = "6f04a49e-7817-408c-aea9-ef7155f0df99";
export const SOURCE_TYPE_KIT_ITEM = "Kit Item"; // The name of the Kit Item Source Type.

// These constant define the DB name and key for the Emblem Palette DB.
export const EMBLEM_PALETTE_DB = "EmblemPalettes";
export const EMBLEM_PALETTE_NAME_FIELD = "itemName";
export const EMBLEM_PALETTE_IMAGE_FIELD = "image";
export const EMBLEM_PALETTE_WAYPOINT_ID_FIELD = "waypointId";
export const EMBLEM_PALETTE_CONFIGURATION_ID_FIELD = "configurationId";
export const EMBLEM_PALETTE_KEY = "Emblem Palette";

// Usually, we use the Waypoint Field value for our processing keys, but Cores and Kits don't have this. We specify those keys here.
export const CORE_PROCESSING_KEY = "Cores";
export const KIT_PROCESSING_KEY = "Kits";

// The ITEM_TYPES constant is used to identify which type of item is being processed.
export const ITEM_TYPES = {
	core: "core",
	kit: "kit",
	item: "item",
	attachment: "attachment"
};

// If a customization category has cores, its key will be included in this array.
// Note that Attachment categories should be included for Folder Dict reasons.
export const HAS_CORE_ARRAY = [
	ArmorConstants.ARMOR_KEY,
	ArmorConstants.ARMOR_ATTACHMENT_KEY,
	WeaponConstants.WEAPON_KEY,
	VehicleConstants.VEHICLE_KEY
];

// If a Customization Category has a type with attachments, it can be referenced here.
export const HAS_ATTACHMENTS_ARRAY = [
	ArmorConstants.ARMOR_KEY
];

// If a Customization Category features Kits, it will be listed here.
export const HAS_KITS_ARRAY = [
	ArmorConstants.ARMOR_KEY,
	WeaponConstants.WEAPON_KEY
];

// If a Customization Category is for Attachments, it will be listed here.
export const IS_ATTACHMENTS_ARRAY = [
	ArmorConstants.ARMOR_ATTACHMENT_KEY
];

// If a Customization Category has a type with Emblem Palettes, it can be referenced here.
export const HAS_EMBLEM_PALETTES_ARRAY = [
	ArmorConstants.ARMOR_KEY,
	WeaponConstants.WEAPON_KEY,
	VehicleConstants.VEHICLE_KEY,
	SpartanIdConstants.SPARTAN_ID_KEY
];

// All Customization Category belong in this Array.
export const IS_CUSTOMIZATION_ARRAY = [
	ArmorConstants.ARMOR_KEY,
	ArmorConstants.ARMOR_ATTACHMENT_KEY,
	WeaponConstants.WEAPON_KEY,
	VehicleConstants.VEHICLE_KEY,
	BodyAndAiConstants.BODY_AND_AI_KEY,
	SpartanIdConstants.SPARTAN_ID_KEY
];

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


// This constant dict allows us to pull the URL for an item from its DB JSON.
export const CUSTOMIZATION_CATEGORY_URL_FIELDS = {
	[ArmorConstants.ARMOR_KEY]: "link-armor-customizations-itemName",
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: "link-armor-customization-attachments-itemName",
	[WeaponConstants.WEAPON_KEY]: "link-items-title",
	[VehicleConstants.VEHICLE_KEY]: "link-vehicle-customizations-title",
	[BodyAndAiConstants.BODY_AND_AI_KEY]: "link-body-ai-customizations-itemName-2",
	[SpartanIdConstants.SPARTAN_ID_KEY]: "link-presentation-customizations-title"
}

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
		"AttachmentKey": ArmorConstants.ARMOR_ATTACHMENT_KEY,
		"SocketDb": ArmorConstants.ARMOR_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketWaypointFieldAttachmentParentField": "waypointFieldAttachmentParent",
		"SocketWaypointFieldAttachmentListField": "waypointFieldAttachmentList",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketIsKitField": "isKit",
		"SocketHasPalettesField": "hasPalettes",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"CoreDb": ArmorConstants.ARMOR_CORE_DB,
		"CoreNameField": "name",
		"CoreWaypointIdField": "waypointId",
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
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"CustomizationAttachmentReferenceField": "ArmorCustomizationAttachments",
		"CustomizationKitItemReferenceField": "adi4LightHalfMiddleTitles",
		"CustomizationKitAttachmentReferenceField": "ArmorCustomizationAttachments-1",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationAltTextField": "altText",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_ARMOR_REFERENCE_FIELD
	},

	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: {
		"SocketDb": ArmorConstants.ARMOR_ATTACHMENT_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketParentTypeReferenceField": "parentTypeReference",
		"SocketMediaFolderField": "mediaFolder",
		"SocketParentMediaFolderField": "parentMediaFolder",
		"CustomizationDb": ArmorConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_DB,
		"CustomizationNameField": "itemName",
		"CustomizationImageField": "image",
		"CustomizationSocketReferenceField": ArmorConstants.ARMOR_ATTACHMENT_SOCKET_REFERENCE_FIELD,
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ParentKey": ArmorConstants.ARMOR_KEY,
		"ShopReferenceField": ShopConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD
	},

	[WeaponConstants.WEAPON_KEY]: {
		"SocketDb": WeaponConstants.WEAPON_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketIsKitField": "isKit",
		"SocketHasPalettesField": "hasPalettes",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"CoreDb": WeaponConstants.WEAPON_CORE_DB,
		"CoreNameField": "name",
		"CoreWaypointIdField": "waypointId",
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
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"CustomizationKitItemReferenceField": "Items",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_WEAPON_REFERENCE_FIELD
	},

	[VehicleConstants.VEHICLE_KEY]: {
		"SocketDb": VehicleConstants.VEHICLE_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketHasPalettesField": "hasPalettes",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"CoreDb": VehicleConstants.VEHICLE_CORE_DB,
		"CoreNameField": "name",
		"CoreWaypointIdField": "waypointId",
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
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_VEHICLE_REFERENCE_FIELD
	},

	[BodyAndAiConstants.BODY_AND_AI_KEY]: {
		"SocketDb": BodyAndAiConstants.BODY_AND_AI_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketMediaFolderField": "mediaFolder",
		"CustomizationDb": BodyAndAiConstants.BODY_AND_AI_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": BodyAndAiConstants.BODY_AND_AI_SOCKET_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD
	},

	[SpartanIdConstants.SPARTAN_ID_KEY]: {
		"SocketDb": SpartanIdConstants.SPARTAN_ID_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketHasPalettesField": "hasPalettes",
		"SocketMediaFolderField": "mediaFolder",
		"CustomizationDb": SpartanIdConstants.SPARTAN_ID_CUSTOMIZATION_DB,
		"CustomizationNameField": "itemName",
		"CustomizationSocketReferenceField": SpartanIdConstants.SPARTAN_ID_SOCKET_REFERENCE_FIELD,
		"CustomizationImageField": "image",
		"CustomizationQualityReferenceField": "qualityReference",
		"CustomizationLoreField": "flavorText",
		"CustomizationManufacturerReferenceField": "manufacturerReference",
		"CustomizationReleaseReferenceField": "releaseReference",
		"CustomizationSourceField": "source",
		"CustomizationSourceTypeField": "sourceTypeReference",
		"CustomizationWaypointIdField": "waypointId",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD
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
		"CoreItemETagField": "itemETag",
		"CoreSourceField": "source",
		"CoreHiddenField": "hidden",
		"CoreNeedsReviewField": "needsReview",
		"CoreChangeLogField": "changeLog",
		"CoreAltTextField": "altText",
		"CoreWaypointIdField": "waypointId",
		"CoreApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"CoreCurrentlyAvailableField": "currentlyAvailable",
		"CoreFolder": "Armor Cores",
		"CoreType": "Armor Core"
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
		"CoreItemETagField": "itemETag",
		"CoreSourceField": "source",
		"CoreHiddenField": "hidden",
		"CoreNeedsReviewField": "needsReview",
		"CoreChangeLogField": "changeLog",
		"CoreAltTextField": "altText",
		"CoreWaypointIdField": "waypointId",
		"CoreApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"CoreCurrentlyAvailableField": "currentlyAvailable",
		"CoreFolder": "Weapon Cores",
		"CoreType": "Weapon Core"
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
		"CoreItemETagField": "itemETag",
		"CoreSourceField": "source",
		"CoreHiddenField": "hidden",
		"CoreNeedsReviewField": "needsReview",
		"CoreChangeLogField": "changeLog",
		"CoreAltTextField": "altText",
		"CoreWaypointIdField": "waypointId",
		"CoreApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"CoreCurrentlyAvailableField": "currentlyAvailable",
		"CoreFolder": "Vehicle Cores",
		"CoreType": "Vehicle Core"
	}
};

export const SHOP_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT = {
	[ShopConstants.SHOP_ARMOR_REFERENCE_FIELD]: ArmorConstants.ARMOR_KEY,
	[ShopConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD]: ArmorConstants.ARMOR_ATTACHMENT_KEY,
	[ShopConstants.SHOP_WEAPON_REFERENCE_FIELD]: WeaponConstants.WEAPON_KEY,
	[ShopConstants.SHOP_VEHICLE_REFERENCE_FIELD]: VehicleConstants.VEHICLE_KEY,
	[ShopConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD]: BodyAndAiConstants.BODY_AND_AI_KEY,
	[ShopConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD]: SpartanIdConstants.SPARTAN_ID_KEY,
	[ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD]: ConsumablesConstants.CONSUMABLES_KEY
}

export const CAPSTONE_CHALLENGE_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT = {
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_ARMOR_REFERENCE_FIELD]: ArmorConstants.ARMOR_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_ARMOR_ATTACHMENT_REFERENCE_FIELD]: ArmorConstants.ARMOR_ATTACHMENT_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_WEAPON_REFERENCE_FIELD]: WeaponConstants.WEAPON_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_VEHICLE_REFERENCE_FIELD]: VehicleConstants.VEHICLE_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_BODY_AND_AI_REFERENCE_FIELD]: BodyAndAiConstants.BODY_AND_AI_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_SPARTAN_ID_REFERENCE_FIELD]: SpartanIdConstants.SPARTAN_ID_KEY,
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_CONSUMABLE_REFERENCE_FIELD]: ConsumablesConstants.CONSUMABLES_KEY
}

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