// Filename: public/Constants/GeneralConstants.js
// Constants used within general helper functions.

import * as ArmorConstants from 'public/Constants/ArmorConstants.js';
import * as WeaponConstants from 'public/Constants/WeaponConstants.js';
import * as VehicleConstants from 'public/Constants/VehicleConstants.js';
import * as BodyAndAiConstants from 'public/Constants/BodyAndAiConstants.js';
import * as SpartanIdConstants from 'public/Constants/SpartanIdConstants.js';
import * as ConsumablesConstants from 'public/Constants/ConsumablesConstants.js';
import * as ShopConstants from 'public/Constants/ShopConstants.js';
import * as PassConstants from 'public/Constants/PassConstants.js';
import * as CustomizationConstants from 'public/Constants/CustomizationConstants.js';

export const REGEX_WAYPOINT_ID_FROM_PATH = /\d[^.]+/;

export const INFINITE_NEWS_URL_BASE = "https://www.haloinfinitenews.com";

export const FILE_DICT_RETURNED_FILES_LIMIT = 500;

export const CUSTOMIZATION_ROOT_FOLDER = "Customization Images";

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
	[CustomizationConstants.EMBLEM_PALETTE_KEY]: "Emblem Palettes",
	[CustomizationConstants.MANUFACTURER_KEY]: "Manufacturer Logos"
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