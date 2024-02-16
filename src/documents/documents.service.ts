import { HttpException, Injectable } from "@nestjs/common";
import { FormSchemaFormat, JSONSchema, JSONSchemaArray, JSONSchemaObject } from "src/forms/dto/form.dto";
import { isObject  } from "src/type-utils";
import { StoreService } from "src/store/store.service";
import { CACHE_10_MIN } from "src/utils";
import { Document } from "./documents.dto";

@Injectable()
export class DocumentsService {
	private store = this.storeService.forResource<Document>("document", {
		cache: CACHE_10_MIN
	});

	constructor(private storeService: StoreService) {}

	findOne = this.store.findOne;
}

export const checkHasOnlyFieldsInForm = (data: Partial<Document>, form: FormSchemaFormat): void => {
	// Keys not usually listed in form fields but are always valid.
	const metaKeys = [
		"id", "formID", "dateCreated", "dateEdited", "creator", "editor", "type",
		"publicityRestrictions", "sourceID", "collectionID", "@type", "locked",
		"namedPlaceID", "@context", "legUserID", "additionalIDs", "secureLevel",
		"keywords", "coordinateSource", "dataOrigin", "caption", "namedPlaceNotes"
	];
	const recursively = (data: unknown, schema: JSONSchema) => {
		if (isObject(data)) Object.keys(data).forEach(key => {
			if (metaKeys.some(k => key === k)) {
				return;
			}
			if (!(schema as JSONSchemaObject).properties[key]) {
				throw new HttpException(
					"Unprocessable Entity",
					422,
					{ cause: `Property ${key} not in form ${form.id} schema!` }
				);
			}
			if (key === "geometry") { // Don't validate internals of the geometry, as the type is just an empty object.
				return;
			}
			recursively(data[key], (schema as JSONSchemaObject).properties[key]);
		}); else if (Array.isArray(data)) {
			data.forEach(item => recursively(item, (schema as JSONSchemaArray).items));
		}
	};
	recursively(data, form.schema);
};
