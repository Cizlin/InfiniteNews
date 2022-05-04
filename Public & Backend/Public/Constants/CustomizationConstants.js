// Filename: public/Constants/CustomizationConstants.js
// Constants used within the Customization Import

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';

import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as CapstoneChallengeConstants from 'public/Constants/CapstoneChallengeConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';

import * as GeneralConstants from 'public/Constants/GeneralConstants.js';

// File system constants.
export const PLACEHOLDER_IMAGE_URL = "wix:image://v1/ee59cf_76d024fd4c2a4cab80bda937a1e1c926~mv2.png/Placeholder%20Image.png#originWidth=275&originHeight=183";

// These constants contain the DB names for several general purpose DBs.
export const QUALITY_DB = "QualityRatings";
export const QUALITY_FIELD = "quality";

export const MANUFACTURER_DB = "Manufacturer";
export const MANUFACTURER_FIELD = "manufacturer";
export const MANUFACTURER_IMAGE_FIELD = "image";
export const MANUFACTURER_ORDINAL_FIELD = "ordinal";
export const MANUFACTURER_KEY = "Manufacturer";

export const RELEASE_DB = "Releases";
export const RELEASE_FIELD = "release";
export const RELEASE_IS_CURRENT_FIELD = "isCurrent";
export const RELEASE_ORDINAL_FIELD = "ordinal";

// Normally we wouldn't want to include DB IDs in these config files, but in this case, it's for performance.
export const SOURCE_TYPE_DB = "Sources";
export const SOURCE_TYPE_NAME_FIELD = "name";
export const SOURCE_TYPE_PENDING = "(Pending)"; // The name of the (Pending) Source Type.
export const SOURCE_TYPE_PENDING_ID = "682d9532-14a9-4f27-9454-6c0d2275a4f4"; 
export const SOURCE_TYPE_SHOP = "Shop";
export const SOURCE_TYPE_SHOP_ID = "6f04a49e-7817-408c-aea9-ef7155f0df99";
export const SOURCE_TYPE_KIT_ITEM = "Kit Item"; // The name of the Kit Item Source Type.
export const SOURCE_TYPE_BATTLE_PASS_FREE_ID = "bbdf3b9b-ef04-498c-8b22-ac20ae5db98a";
export const SOURCE_TYPE_BATTLE_PASS_FREE = "Battle Pass - Free";
export const SOURCE_TYPE_BATTLE_PASS_PAID_ID = "eb4a06fa-423a-49ac-ba87-dab281442fa5";
export const SOURCE_TYPE_BATTLE_PASS_PAID = "Battle Pass - Paid";
export const SOURCE_TYPE_EVENT_PASS_ID = "bbff99ba-c34a-46f0-adcd-a5dab25a1f65";
export const SOURCE_TYPE_EVENT_PASS = "Event Pass";
export const SOURCE_TYPE_CAPSTONE_CHALLENGE_ID = "f473441a-a02f-4c96-bf99-8324d1bb23cb";

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

export const IS_CUSTOMIZATION_OR_CONSUMABLE_ARRAY = [
	ArmorConstants.ARMOR_KEY,
	ArmorConstants.ARMOR_ATTACHMENT_KEY,
	WeaponConstants.WEAPON_KEY,
	VehicleConstants.VEHICLE_KEY,
	BodyAndAiConstants.BODY_AND_AI_KEY,
	SpartanIdConstants.SPARTAN_ID_KEY,
	ConsumablesConstants.CONSUMABLES_KEY
]

export const CATEGORY_TO_CORE_WAYPOINT_ID_DICT = {
	[ArmorConstants.ARMOR_KEY]: ArmorConstants.ARMOR_CORE_WAYPOINT_ID,
	[WeaponConstants.WEAPON_KEY]: WeaponConstants.WEAPON_CORE_WAYPOINT_ID,
	[VehicleConstants.VEHICLE_KEY]: VehicleConstants.VEHICLE_CORE_WAYPOINT_ID
}

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
		"SocketIsPartialCrossCoreField": "isPartialCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"SocketCoreReferenceField": ArmorConstants.ARMOR_SOCKET_CORE_REFERENCE_FIELD,
		"AnySocketId": ArmorConstants.ANY_ARMOR_SOCKET_ID,
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
		"CustomizationAttachmentReferenceField": ArmorConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_REFERENCE_FIELD,
		"CustomizationKitItemReferenceField": "adi4LightHalfMiddleTitles",
		"CustomizationKitAttachmentReferenceField": "ArmorCustomizationAttachments-1",
		"CustomizationItemETagField": "itemETag",
		"CustomizationHiddenField": "hidden",
		"CustomizationNeedsReviewField": "needsReview",
		"CustomizationChangeLogField": "changeLog",
		"CustomizationCurrentlyAvailableField": "currentlyAvailable",
		"CustomizationIsKitItemOnlyField": "isKitItemOnly",
		"CustomizationAltTextField": "altText",
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-armor-customizations-itemName",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_ARMOR_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_ARMOR_REFERENCE_FIELD,
		"UrlCustomization": GeneralConstants.URL_ARMOR_CUSTOMIZATION,
		"UrlSockets": GeneralConstants.URL_ARMOR_SOCKETS,
		"UrlCoreParam": GeneralConstants.URL_ARMOR_CORE_PARAM,
		"UrlSocketParam": GeneralConstants.URL_ARMOR_SOCKET_PARAM,
		"DefaultCoreName": "All Armor Cores",
		"DefaultSocketName": "All Armor Sockets"
	},

	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: {
		"SocketDb": ArmorConstants.ARMOR_ATTACHMENT_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketIsPartialCrossCoreField": "isPartialCrossCore",
		"SocketParentTypeReferenceField": "parentTypeReference",
		"SocketMediaFolderField": "mediaFolder",
		"SocketParentMediaFolderField": "parentMediaFolder",
		"AnySocketId": ArmorConstants.ANY_ARMOR_ATTACHMENT_SOCKET_ID,
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
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-armor-customization-attachments-itemName",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"CustomizationParentReferenceField": ArmorConstants.ARMOR_CUSTOMIZATION_ATTACHMENTS_PARENT_REFERENCE_FIELD,
		"ParentKey": ArmorConstants.ARMOR_KEY,
		"ShopReferenceField": ShopConstants.SHOP_ARMOR_ATTACHMENT_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_ARMOR_ATTACHMENT_REFERENCE_FIELD
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
		"SocketIsPartialCrossCoreField": "isPartialCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"SocketCoreReferenceField": WeaponConstants.WEAPON_SOCKET_CORE_REFERENCE_FIELD,
		"AnySocketId": WeaponConstants.ANY_WEAPON_SOCKET_ID,
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
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-items-title",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_WEAPON_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_WEAPON_REFERENCE_FIELD,
		"UrlCustomization": GeneralConstants.URL_WEAPON_CUSTOMIZATION,
		"UrlSockets": GeneralConstants.URL_WEAPON_SOCKETS,
		"UrlCoreParam": GeneralConstants.URL_WEAPON_CORE_PARAM,
		"UrlSocketParam": GeneralConstants.URL_WEAPON_SOCKET_PARAM,
		"DefaultCoreName": "All Weapon Cores",
		"DefaultSocketName": "All Weapon Sockets"
	},

	[VehicleConstants.VEHICLE_KEY]: {
		"SocketDb": VehicleConstants.VEHICLE_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketHasPalettesField": "hasPalettes",
		"SocketIsCrossCoreField": "isCrossCore",
		"SocketIsPartialCrossCoreField": "isPartialCrossCore",
		"SocketMediaFolderField": "mediaFolder",
		"SocketCoreReferenceField": VehicleConstants.VEHICLE_SOCKET_CORE_REFERENCE_FIELD,
		"AnySocketId": VehicleConstants.ANY_VEHICLE_SOCKET_ID,
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
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-vehicle-customizations-title",
		"EmblemPaletteReferenceField": "emblemPalettes",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_VEHICLE_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_VEHICLE_REFERENCE_FIELD,
		"UrlCustomization": GeneralConstants.URL_VEHICLE_CUSTOMIZATION,
		"UrlSockets": GeneralConstants.URL_VEHICLE_SOCKETS,
		"UrlCoreParam": GeneralConstants.URL_VEHICLE_CORE_PARAM,
		"UrlSocketParam": GeneralConstants.URL_VEHICLE_SOCKET_PARAM,
		"DefaultCoreName": "All Vehicle Cores",
		"DefaultSocketName": "All Vehicle Sockets"
	},

	[BodyAndAiConstants.BODY_AND_AI_KEY]: {
		"SocketDb": BodyAndAiConstants.BODY_AND_AI_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketWaypointFieldField": "waypointField",
		"SocketHasAttachmentsField": "hasAttachments",
		"SocketMediaFolderField": "mediaFolder",
		"AnySocketId": BodyAndAiConstants.ANY_BODY_AND_AI_SOCKET_ID,
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
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-body-ai-customizations-itemName-2",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_BODY_AND_AI_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_BODY_AND_AI_REFERENCE_FIELD,
		"UrlCustomization": GeneralConstants.URL_BODY_AND_AI_CUSTOMIZATION,
		"UrlSocketParam": GeneralConstants.URL_BODY_AND_AI_SOCKET_PARAM,
		"DefaultSocketName": "All Body & AI Categories"
	},

	[SpartanIdConstants.SPARTAN_ID_KEY]: {
		"SocketDb": SpartanIdConstants.SPARTAN_ID_SOCKET_DB,
		"SocketNameField": "name",
		"SocketWaypointIdField": "waypointId",
		"SocketHasPalettesField": "hasPalettes",
		"SocketMediaFolderField": "mediaFolder",
		"AnySocketId": SpartanIdConstants.ANY_SPARTAN_ID_SOCKET_ID,
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
		"CustomizationImageCreditField": "imageCredit",
		"CustomizationUrlField": "link-presentation-customizations-title",
		"CustomizationApiLastUpdatedDatetimeField": "apiLastUpdatedDatetime",
		"ShopReferenceField": ShopConstants.SHOP_SPARTAN_ID_REFERENCE_FIELD,
		"CapstoneChallengeReferenceField": CapstoneChallengeConstants.CAPSTONE_CHALLENGE_SPARTAN_ID_REFERENCE_FIELD,
		"UrlCustomization": GeneralConstants.URL_SPARTAN_ID_CUSTOMIZATION,
		"UrlSocketParam": GeneralConstants.URL_SPARTAN_ID_SOCKET_PARAM,
		"DefaultSocketName": "All Spartan ID Categories"
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
		"CoreType": "Armor Core",
		"CoreUrlField": "link-armor-cores-name",
		"AnyCoreId": ArmorConstants.ANY_ARMOR_CORE_ID
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
		"CoreType": "Weapon Core",
		"CoreUrlField": "link-weapon-cores-name",
		"AnyCoreId": WeaponConstants.ANY_WEAPON_CORE_ID
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
		"CoreType": "Vehicle Core",
		"CoreUrlField": "link-vehicle-cores-name",
		"AnyCoreId": VehicleConstants.ANY_VEHICLE_CORE_ID
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
	[CapstoneChallengeConstants.CAPSTONE_CHALLENGE_SPARTAN_ID_REFERENCE_FIELD]: SpartanIdConstants.SPARTAN_ID_KEY
}

export const CUSTOMIZATION_CATEGORY_TO_PASS_RANK_REFERENCE_FIELD_DICT = {
	[ArmorConstants.ARMOR_KEY]: PassConstants.PASS_RANK_ARMOR_REFERENCE_FIELD,
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: PassConstants.PASS_RANK_ARMOR_ATTACHMENT_REFERENCE_FIELD,
	[WeaponConstants.WEAPON_KEY]: PassConstants.PASS_RANK_WEAPON_REFERENCE_FIELD,
	[VehicleConstants.VEHICLE_KEY]: PassConstants.PASS_RANK_VEHICLE_REFERENCE_FIELD,
	[BodyAndAiConstants.BODY_AND_AI_KEY]: PassConstants.PASS_RANK_BODY_AND_AI_REFERENCE_FIELD,
	[SpartanIdConstants.SPARTAN_ID_KEY]: PassConstants.PASS_RANK_SPARTAN_ID_REFERENCE_FIELD,
	[ConsumablesConstants.CONSUMABLES_KEY]: PassConstants.PASS_RANK_CONSUMABLE_REFERENCE_FIELD
};


export const CUSTOMIZATION_CATEGORY_TO_PASS_RANK_CORE_REFERENCE_FIELD_DICT = {
	[ArmorConstants.ARMOR_KEY]: PassConstants.PASS_RANK_ARMOR_CORE_REFERENCE_FIELD,
	[WeaponConstants.WEAPON_KEY]: PassConstants.PASS_RANK_WEAPON_CORE_REFERENCE_FIELD,
	[VehicleConstants.VEHICLE_KEY]: PassConstants.PASS_RANK_VEHICLE_CORE_REFERENCE_FIELD,
};

export const PASS_RANK_ITEM_FIELD_TO_CUSTOMIZATION_CATEGORY_DICT = {
	[PassConstants.PASS_RANK_ARMOR_REFERENCE_FIELD]: ArmorConstants.ARMOR_KEY,
	[PassConstants.PASS_RANK_ARMOR_ATTACHMENT_REFERENCE_FIELD]: ArmorConstants.ARMOR_ATTACHMENT_KEY,
	[PassConstants.PASS_RANK_WEAPON_REFERENCE_FIELD]: WeaponConstants.WEAPON_KEY,
	[PassConstants.PASS_RANK_VEHICLE_REFERENCE_FIELD]: VehicleConstants.VEHICLE_KEY,
	[PassConstants.PASS_RANK_BODY_AND_AI_REFERENCE_FIELD]: BodyAndAiConstants.BODY_AND_AI_KEY,
	[PassConstants.PASS_RANK_SPARTAN_ID_REFERENCE_FIELD]: SpartanIdConstants.SPARTAN_ID_KEY,
	[PassConstants.PASS_RANK_CONSUMABLE_REFERENCE_FIELD]: ConsumablesConstants.CONSUMABLES_KEY
}

export const PASS_RANK_ITEM_FIELD_CORE_CATEGORY_DICT = {
	[PassConstants.PASS_RANK_ARMOR_CORE_REFERENCE_FIELD]: ArmorConstants.ARMOR_KEY,
	[PassConstants.PASS_RANK_WEAPON_CORE_REFERENCE_FIELD]: WeaponConstants.WEAPON_KEY,
	[PassConstants.PASS_RANK_VEHICLE_CORE_REFERENCE_FIELD]: VehicleConstants.VEHICLE_KEY
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

// This dictionary contains the high-level folders for each category within Customization Images.
export const CUSTOMIZATION_CATEGORY_FOLDER_DICT = {
	[ArmorConstants.ARMOR_KEY]: "Armor Customization",
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: "Armor Customization",
	[WeaponConstants.WEAPON_KEY]: "Weapon Customization",
	[VehicleConstants.VEHICLE_KEY]: "Vehicle Customization",
	[BodyAndAiConstants.BODY_AND_AI_KEY]: "Body & AI Customization",
	[SpartanIdConstants.SPARTAN_ID_KEY]: "Spartan ID Customization",
	[ConsumablesConstants.CONSUMABLES_KEY]: "Consumables",
	[ShopConstants.SHOP_KEY]: "Shop",
	[PassConstants.PASS_KEY]: "Passes",
	[EMBLEM_PALETTE_KEY]: "Emblem Palettes",
	[MANUFACTURER_KEY]: "Manufacturer Logos"
}

// This dictionary contains the folders for each customization type within the customization category folders.
export const CUSTOMIZATION_TYPE_FOLDER_DICT = {
	// MOVED ALL CUSTOMIZATION TYPE INFO TO THEIR DBS. THIS IS NOW IN THE mediaFolder FIELD.
	/*[ArmorConstants.ARMOR_KEY]: {
		[ArmorConstants.ARMOR_CORE_KEY]: "Armor Cores",
		[ArmorConstants.ARMOR_KIT_KEY]: "Armor Kits",
		[ArmorConstants.ARMOR_COATING_KEY]: "Armor Coatings",
		[ArmorConstants.ARMOR_HELMET_KEY]: "Helmets",
		[ArmorConstants.ARMOR_VISOR_KEY]: "Visors",
		[ArmorConstants.ARMOR_CHEST_KEY]: "Chests",
		[ArmorConstants.ARMOR_LEFT_SHOULDER_PAD_KEY]: "Left Shoulder Pads",
		[ArmorConstants.ARMOR_RIGHT_SHOULDER_PAD_KEY]: "Right Shoulder Pads",
		[ArmorConstants.ARMOR_GLOVES_KEY]: "Gloves",
		[ArmorConstants.ARMOR_WRIST_KEY]: "Wrists",
		[ArmorConstants.ARMOR_UTILITY_KEY]: "Utilities",
		[ArmorConstants.ARMOR_KNEE_PADS_KEY]: "Knee Pads",
		[ArmorConstants.ARMOR_EMBLEM_KEY]: "Armor Emblems",
		[ArmorConstants.ARMOR_EFFECT_KEY]: "Armor Effects",
		[ArmorConstants.ARMOR_MYTHIC_EFFECT_SET_KEY]: "Mythic Effect Sets"
	},
	[ArmorConstants.ARMOR_ATTACHMENT_KEY]: {
		[ArmorConstants.ARMOR_HELMET_ATTACHMENT_KEY]: "Armor Attachments"
	},
	[WeaponConstants.WEAPON_KEY]: {
		[WeaponConstants.WEAPON_CORE_KEY]: "Weapon Cores",
		[WeaponConstants.WEAPON_KIT_KEY]: "Weapon Kits",
		[WeaponConstants.WEAPON_COATING_KEY]: "Weapon Coatings",
		[WeaponConstants.WEAPON_MODEL_KEY]: "Weapon Models",
		[WeaponConstants.WEAPON_CHARM_KEY]: "Charms",
		[WeaponConstants.WEAPON_EMBLEM_KEY]: "Weapon Emblems",
		[WeaponConstants.WEAPON_KILL_EFFECT_KEY]: "Kill Effects"
	},
	[VehicleConstants.VEHICLE_KEY]: {
		[VehicleConstants.VEHICLE_CORE_KEY]: "Vehicle Cores",
		[VehicleConstants.VEHICLE_COATING_KEY]: "Vehicle Coatings",
		[VehicleConstants.VEHICLE_MODEL_KEY]: "Vehicle Models",
		[VehicleConstants.VEHICLE_EMBLEM_KEY]: "Vehicle Emblems"
	},
	[BodyAndAiConstants.BODY_AND_AI_KEY]: {
		[BodyAndAiConstants.BODY_AND_AI_MODEL]: "AI Models",
		[BodyAndAiConstants.BODY_AND_AI_COLOR]: "AI Colors"
	},
	[SpartanIdConstants.SPARTAN_ID_KEY]: {
		[SpartanIdConstants.SPARTAN_ID_NAMEPLATE_KEY]: "Nameplates",
		[SpartanIdConstants.SPARTAN_ID_BACKDROP_KEY]: "Backdrops",
		[SpartanIdConstants.SPARTAN_ID_STANCE_KEY]: "Stances"
	},*/
	[ShopConstants.SHOP_KEY]: {
		[ShopConstants.SHOP_DAILY]: "Daily",
		[ShopConstants.SHOP_WEEKLY]: "Weekly",
		[ShopConstants.SHOP_INDEFINITE]: "Indefinite",
		[ShopConstants.SHOP_HCS]: "HCS"
	},
	[PassConstants.PASS_KEY]: {
		[PassConstants.PASS_BATTLE]: "Battle Passes",
		[PassConstants.PASS_EVENT]: "Event Passes"
	}
}