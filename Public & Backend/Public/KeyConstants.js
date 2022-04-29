// Filename: public/KeyConstants.js 

export const KEY_VALUE_DB = "DynamicKeyValues";
export const KEY_VALUE_CUSTOMIZATION_FOLDERS_KEY = "CustomizationFolderHierarchy";

// The following keys are used to access and save the user's filter selections when viewing an item. They are reset upon visiting any Sockets page.
export const QUALITY_KEY = "qualityKey";
export const PROMOTIONAL_KEY = "promotionalKey";
export const AVAILABLE_KEY = "availableKey";
export const RELEASE_KEY = "releaseKey";
export const HIDDEN_KEY = "hiddenKey";
export const QUICK_SEARCH_KEY = "quickSearchKey";
export const DEFAULT_FILTER_VALUE = "Any";

export const TIMEFRAME_KEY = "timeframeKey";
export const SHOP_TYPE_KEY = "shopTypeKey";

export const PASS_TYPE_KEY = "passTypeKey";

// These constants are deprecated and will be removed once the refactoring is completed.
export const qualityKey = "qualityKey";
export const promotionalKey = "promotionalKey";
export const availableKey = "availableKey";
export const releaseKey = "releaseKey";
export const quickSearchKey = "quickSearchKey";

// These constants contain the DB names for several general purpose DBs.
export const QUALITY_DB = "QualityRatings";
export const MANUFACTURER_DB = "Manufacturer";
export const MANUFACTURER_KEY = "Manufacturer";
export const RELEASE_DB = "Releases";
export const SOURCE_TYPE_DB = "Sources";

// This constant defines the DB name for the Emblem Palette DB.
export const EMBLEM_PALETTE_DB = "EmblemPalettes";
export const EMBLEM_PALETTE_KEY = "Emblem Palette";

// These constants are used to identify the "Any" Core and Socket options for Armor, as well as define the Armor customization section.
export const ARMOR_KEY = "Armor";
export const ARMOR_ATTACHMENT_KEY = "ArmorAttachments"
export const ANY_ARMOR_CORE_ID = "25d0be25-e9dc-4b45-8e39-52b13fe29c11";
export const ANY_ARMOR_SOCKET_ID = "3bdaaf99-03cf-4d6d-93b0-b89b9cf3ccd7";
export const ARMOR_CORE_CUSTOMIZATION_SECTION = "Armor Cores";
export const ARMOR_CUSTOMIZATION_SECTION = "Armor Hall";
export const ARMOR_CORE_DB = "ArmorCores";
export const ARMOR_SOCKET_DB = "ArmorSockets";
export const ARMOR_CUSTOMIZATION_DB = "adi4LightHalfMiddleTitles";
export const ARMOR_CUSTOMIZATION_ATTACHMENTS_DB = "ArmorCustomizationAttachments";
export const ARMOR_CORE_REFERENCE_FIELD = "armorCoreReferences"; // The name of the Core reference field within the Customization DB.
export const ARMOR_SOCKET_REFERENCE_FIELD = "customizationTypeReference"; // The name of the socket reference field within the Customization DB
export const ARMOR_SOCKET_CORE_REFERENCE_FIELD = "coreReference"; // The name of the Core reference field within the Socket DB.
export const ARMOR_CUSTOMIZATION_ATTACHMENTS_PARENT_REFERENCE_FIELD = "adi4LightHalfMiddleTitles";
export const ARMOR_CUSTOMIZATION_ATTACHMENTS_REFERENCE_FIELD = "ArmorCustomizationAttachments"; // The name of the attachment reference field within the Customization DB.

// These constants are used by the backend for Socket/Type definitions.
export const ARMOR_CORE_KEY = "Armor Core";
export const ARMOR_KIT_KEY = "Armor Kit";
export const ARMOR_COATING_KEY = "Armor Coating";
export const ARMOR_HELMET_KEY = "Helmet";
export const ARMOR_VISOR_KEY = "Visor";
export const ARMOR_CHEST_KEY = "Chest";
export const ARMOR_LEFT_SHOULDER_PAD_KEY = "Left Shoulder Pad";
export const ARMOR_RIGHT_SHOULDER_PAD_KEY = "Right Shoulder Pad";
export const ARMOR_GLOVES_KEY = "Gloves";
export const ARMOR_WRIST_KEY = "Wrist";
export const ARMOR_UTILITY_KEY = "Utility";
export const ARMOR_KNEE_PADS_KEY = "Knee Pads";
export const ARMOR_EMBLEM_KEY = "Armor Emblem";
export const ARMOR_EFFECT_KEY = "Armor Effect";
export const ARMOR_MYTHIC_EFFECT_SET_KEY = "Mythic Effect Set";

// This constant is used for the Armor Attachments pages.
export const ARMOR_ATTACHMENT_CUSTOMIZATION_SECTION = "Armor Attachments";
export const ARMOR_HELMET_ATTACHMENT_KEY = "Helmet Attachment";


// These constants are used to identify the "Any" Core and Socket options for Weapons, as well as define the Weapons customization section.
export const WEAPON_KEY = "Weapon";
export const ANY_WEAPON_CORE_ID = "107b9f05-afd6-4697-98a3-03e33696a66b";
export const ANY_WEAPON_SOCKET_ID = "aeba44f4-28d3-4553-9688-8940069ca118";
export const WEAPON_CORE_CUSTOMIZATION_SECTION = "Weapon Cores";
export const WEAPON_CUSTOMIZATION_SECTION = "Weapons Bench";
export const WEAPON_CORE_DB = "WeaponCores";
export const WEAPON_SOCKET_DB = "WeaponSockets";
export const WEAPON_CUSTOMIZATION_DB = "Items";
export const WEAPON_CORE_REFERENCE_FIELD = "weaponCoreReferences"; // The name of the Core reference field within the Customization DB.
export const WEAPON_SOCKET_REFERENCE_FIELD = "customizationTypeReference"; // The name of the socket reference field within the Customization DB
export const WEAPON_SOCKET_CORE_REFERENCE_FIELD = "weaponCoreReferences"; // The name of the Core reference field within the Socket DB.

// These constants are used by the backend for Socket/Type definitions.
export const WEAPON_CORE_KEY = "Weapon Core";
export const WEAPON_KIT_KEY = "Weapon Kit";
export const WEAPON_COATING_KEY = "Weapon Coating";
export const WEAPON_MODEL_KEY = "Weapon Model";
export const WEAPON_CHARM_KEY = "Charm";
export const WEAPON_EMBLEM_KEY = "Weapon Emblem";
export const WEAPON_KILL_EFFECT_KEY = "Kill Effect";


// These constants are used to identify the "Any" Core and Socket options for Vehicles, as well as define the Vehicle customization section.
export const VEHICLE_KEY = "Vehicle";
export const ANY_VEHICLE_CORE_ID = "107b9f05-afd6-4697-98a3-03e33696a66b";
export const ANY_VEHICLE_SOCKET_ID = "aeba44f4-28d3-4553-9688-8940069ca118";
export const VEHICLE_CORE_CUSTOMIZATION_SECTION = "Vehicle Cores";
export const VEHICLE_CUSTOMIZATION_SECTION = "Vehicle Bay";
export const VEHICLE_CORE_DB = "VehicleCores";
export const VEHICLE_SOCKET_DB = "VehicleSockets";
export const VEHICLE_CUSTOMIZATION_DB = "VehicleCustomizations";
export const VEHICLE_CORE_REFERENCE_FIELD = "vehicleCoreReferences"; // The name of the Core reference field within the Customization DB.
export const VEHICLE_SOCKET_REFERENCE_FIELD = "customizationTypeReference"; // The name of the socket reference field within the Customization DB
export const VEHICLE_SOCKET_CORE_REFERENCE_FIELD = "vehicleCoreReferences"; // The name of the Core reference field within the Socket DB.

// These constants are used by the backend for Socket/Type definitions.
export const VEHICLE_CORE_KEY = "Vehicle Core";
export const VEHICLE_COATING_KEY = "Vehicle Coating";
export const VEHICLE_MODEL_KEY = "Vehicle Model";
export const VEHICLE_EMBLEM_KEY = "Vehicle Emblem";


// These constants are used to identify the "Any" Socket option for Body & AI, as well as define the Body & AI customization section.
export const BODY_AND_AI_KEY = "BodyAndAi";
export const ANY_BODY_AND_AI_SOCKET_ID = "d832af04-bacb-4686-8321-4d2ccda37ab4";
export const BODY_AND_AI_CUSTOMIZATION_SECTION = "Body & AI";
export const BODY_AND_AI_SOCKET_DB = "BodyAISections";
export const BODY_AND_AI_CUSTOMIZATION_DB = "BodyAICustomizations";
export const BODY_AND_AI_SOCKET_REFERENCE_FIELD = "customizationTypeReference"; // The name of the socket reference field within the Customization DB

// These constants are used by the backend for Socket/Type definitions.
export const BODY_AND_AI_MODEL = "AI Model";
export const BODY_AND_AI_COLOR = "AI Color";


// These constants are used to identify the "Any" Socket option for Spartan ID, as well as define the Spartan ID customization section.
export const SPARTAN_ID_KEY = "SpartanId";
export const ANY_SPARTAN_ID_SOCKET_ID = "783898fe-a6e5-44fe-a80d-884c2ebb532f";
export const SPARTAN_ID_CUSTOMIZATION_SECTION = "Spartan ID";
export const SPARTAN_ID_SOCKET_DB = "PresentationSections";
export const SPARTAN_ID_CUSTOMIZATION_DB = "PresentationCustomizations";
export const SPARTAN_ID_SOCKET_REFERENCE_FIELD = "customizationTypeReference"; // The name of the socket reference field within the Customization DB

// These constants are used by the backend for Socket/Type definitions.
export const SPARTAN_ID_NAMEPLATE_KEY = "Nameplate";
export const SPARTAN_ID_BACKDROP_KEY = "Backdrop";
export const SPARTAN_ID_STANCE_KEY = "Stance";


// These constants are used to identify the Consumables section.
export const CONSUMABLES_KEY = "Consumable";
export const CONSUMABLES_SECTION = "Consumables";
export const CONSUMABLES_DB = "Consumables";


// This constant defines the Shop Listings section.
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


// These constants are used for the Capstone Challenge.
export const CAPSTONE_CHALLENGE_DB = "CapstoneChallenges";
export const CAPSTONE_CHALLENGE_SECTION = "CapstoneChallenges";

// These constants are used for the Battle/Event Passes.
export const PASS_KEY = "Pass";
export const PASSES_SECTION = "Passes";
export const PASS_DB = "Passes";
export const PASS_RANK_DB = "PassRanks";

export const PASS_BATTLE = "Battle Pass";
export const PASS_EVENT = "Event Pass";

export const PASS_ARMOR_CORE_REFERENCE_FIELD = "armorCores";
export const PASS_WEAPON_CORE_REFERENCE_FIELD = "weaponCores";
export const PASS_VEHICLE_CORE_REFERENCE_FIELD = "vehicleCores";