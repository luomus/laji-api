import { Lang, QueryWithPagingDto, QueryWithPersonTokenDto } from "src/common.dto";
import { Area, Form as FormI, Taxon } from "@luomus/laji-schema";
import { OmitType } from "@nestjs/swagger";
import { JSONObjectSerializable } from "src/typing.utils";
import { IsString } from "class-validator";

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

export type Form = FormI & {
	id: string;
	options?: FormOptions;
	validators: Validators;
	warnings?: Validators;
};

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
	/**
	 * Language of fields that have multiple languages. If multi is selected fields that can have multiple languages will contain language objects. Defaults to 'en'
	 */
	lang?: Lang = Lang.en;
	/**
	 * Expand response
	 */
	expand?: boolean = true;
}

export class QueryWithPagingAndLangDto extends QueryWithPagingDto {
	lang?: Lang = Lang.en;
	pageSize?: number = 1000;
}

export class TransformDto extends QueryWithPersonTokenDto {
	/**
	 * Language of fields that have multiple languages. If multi is selected fields that can have multiple languages will contain language objects. Defaults to 'en'
	 */
	lang?: Lang = Lang.en;
}

export class AcceptAccessDto {
	/**
	 * 	Person token who is authorised to accept requests
	 */
	@IsString() personToken: string;

	/**
	 * Access type
	 */
	type: "editor" | "admin" = "editor";
}

export class RevokeAccessDto extends OmitType(AcceptAccessDto, ["type"]) {}

// We use our own typings instead of "json-schema" package because we use only a subset of the schema,
// and so it'll be easier to work with this subset.
export type JSONSchema =
	JSONSchemaObject
	| JSONSchemaArray
	| JSONSchemaNumber
	| JSONSchemaInteger
	| JSONSchemaBoolean
	| JSONSchemaString
	| JSONSchemaEnumOneOf;

type JSONShemaTypeCommon<T, D> = {
	type: T;
	default?: D;
	title?: string;
}

export type JSONSchemaObject = JSONShemaTypeCommon<"object", Record<string, unknown>> & {
	properties: Record<string, JSONSchema>;
	required?: string[];
}

export function isJSONSchemaObject(schema: JSONSchema): schema is JSONSchemaObject {
	return schema.type === "object";
}

export type JSONSchemaArray = JSONShemaTypeCommon<"array", unknown[]> & {
	items: JSONSchema;
	uniqueItems?: boolean;
}

export type JSONSchemaNumber = JSONShemaTypeCommon<"number", number>;

export type JSONSchemaInteger = JSONShemaTypeCommon<"integer", number>;

export type JSONSchemaBoolean = JSONShemaTypeCommon<"boolean", boolean>;

export type JSONSchemaString = JSONShemaTypeCommon<"string", string>;

export type JSONSchemaEnumOneOf = JSONSchemaString & {
	oneOf: {const: string, title: string}[];
}

export function isJSONSchemaEnumOneOf(jsonSchema: JSONSchema): jsonSchema is JSONSchemaEnumOneOf {
	return !!(jsonSchema as any).oneOf;
}

export type Hashed<T> = T & { "$id": string }
