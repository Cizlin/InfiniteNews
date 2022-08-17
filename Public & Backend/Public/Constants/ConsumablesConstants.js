// Filename: public/Constants/ConsumablesConstants.js 
import * as ShopConstants from 'public/Constants/ShopConstants.js';

// These constants are used to identify the Consumables section.
export const CONSUMABLES_KEY = "Consumable";
export const CONSUMABLES_SECTION = "Consumables";
export const CONSUMABLES_DB = "Consumables";

export const CONSUMABLES_NAME_FIELD = "itemName";
export const CONSUMABLES_DESCRIPTION_FIELD = "description";
export const CONSUMABLES_IMAGE_FIELD = "image";
export const CONSUMABLES_QUALITY_REFERENCE_FIELD = "qualityReference";
export const CONSUMABLES_CURRENTLY_AVAILABLE_FIELD = "currentlyAvailable";
export const CONSUMABLES_HIDDEN_FIELD = "hidden";
export const CONSUMABLES_RELEASE_REFERENCE_FIELD = "releaseReference";
export const CONSUMABLES_SOURCE_TYPE_REFERENCE_FIELD = "sourceTypeReference";
export const CONSUMABLES_URL_FIELD = "link-consumables-itemName";

// If we want to at-a-glance determine what type of consumable we have, we do an includes() check with these constants.
export const CONSUMABLES_CHALLENGE_SWAP_PATH_CONTENTS = "rerollcurrency.json";
export const CONSUMABLES_XP_BOOST_PATH_CONTENTS = "xpboost.json";
export const CONSUMABLES_XP_GRANT_PATH_CONTENTS = "xpgrant.json";
export const CONSUMABLES_CREDITS_PATH_CONTENTS = "cR.json";

export const CONSUMABLES_XP_BOOST_NAME = "XP Boost";
export const CONSUMABLES_XP_GRANT_NAME = "XP Grant";
export const CONSUMABLES_CREDITS_NAME = "Credits";
export const CONSUMABLES_CHALLENGE_SWAP_NAME = "Challenge Swap";

export const CONSUMABLES_CATEGORY_SPECIFIC_VARS = {
	[CONSUMABLES_KEY]: {
		"ConsumablesDb": CONSUMABLES_DB,
		"ConsumablesNameField": CONSUMABLES_NAME_FIELD,
		"ConsumablesImageField": "image",
		"ConsumablesQualityReferenceField": CONSUMABLES_QUALITY_REFERENCE_FIELD,
		"ConsumablesLoreField": "flavorText",
		"ConsumablesReleaseReferenceField": CONSUMABLES_RELEASE_REFERENCE_FIELD,
		"ConsumablesSourceField": "source",
		"ConsumablesSourceTypeField": CONSUMABLES_SOURCE_TYPE_REFERENCE_FIELD,
		"ConsumablesHiddenField": CONSUMABLES_HIDDEN_FIELD,
		"ConsumablesCurrentlyAvailableField": CONSUMABLES_CURRENTLY_AVAILABLE_FIELD,
		"ConsumablesAltTextField": "altText",
		"ConsumablesUrlField": "link-consumables-itemName",
		"ShopReferenceField": ShopConstants.SHOP_CONSUMABLE_REFERENCE_FIELD
	}
}
