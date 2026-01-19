import { QueryWithPagingDto } from "src/common.dto";
import { Area, Form as FormI, Taxon } from "@luomus/laji-schema";
import { JSONObjectSerializable } from "src/typing.utils";
import { JSONSchemaObject } from "src/json-schema.utils";

export enum Format {
	schema = "schema",
	json = "json"
}

export type PrepopulatedDocumentFieldFnJoin = {
	fn: "join";
	from: string;
	delimiter?: string;
}

export type PrepopulatedDocumentFieldFnTaxon = {
	fn: "taxon";
	from: string;
	taxonProp?: keyof Taxon;
}

export type PrepopulatedDocumentFieldFnArea = {
	fn: "area";
	from: string;
	type?: Area["areaType"];
	key?: keyof Area;
	delimiter?: string;
}

export type PrepopulatedDocumentFieldFn = PrepopulatedDocumentFieldFnJoin
	| PrepopulatedDocumentFieldFnTaxon
	| PrepopulatedDocumentFieldFnArea;

type FormOptions = NonNullable<FormI["options"]> & {
	namedPlaceOptions?: Omit<NonNullable<FormI["options"]>["namedPlaceOptions"], "prepopulatedDocumentFields"> & {
		prepopulatedDocumentFields?: Record<string, string | PrepopulatedDocumentFieldFn>
	}
}

type ValidatorLeaf = Record<string, JSONObjectSerializable | boolean>;
export type Validators = { [prop: string]: Validators | ValidatorLeaf };

export type Form = Omit<FormI, "translations"> & {
	id: string;
	options?: FormOptions;
	validators: Validators;
	warnings?: Validators;
}

export type FormSchemaFormat = Form & { schema: JSONSchemaObject };

export const isFormSchemaFormat = (form: Form | FormSchemaFormat): form is FormSchemaFormat => !!(form as any).schema;

export type FormListing = Pick<Form & {
	options: FormOptions
},
	"id"
	| "logo"
	| "title"
	| "description"
	| "shortDescription"
	| "supportedLanguage"
	| "category"
	| "collectionID"
	| "name"
	| "options"
>;

export class GetDto {
	format?: Format = Format.schema;
	/** Expand response */
	expand?: boolean = true;
}

export type Hashed<T> = T & { "$id": string }
