// Filename: public/Constants/PassConstants.js
// Constants used to manage the Pass DBs.

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

export const PASS_FOLDER = "Passes";

// This dictionary contains the folders for each Pass type within the /Customization Images/Passes/ folder.
export const PASS_TYPE_FOLDER_DICT = {
	[PASS_BATTLE]: "Battle Passes",
	[PASS_EVENT]: "Event Passes"
}