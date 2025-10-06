import { Lang, QueryWithPagingDto } from "src/common.dto";
import { Area, Form as FormI, Taxon } from "@luomus/laji-schema";
import { OmitType } from "@nestjs/swagger";
import { JSONObjectSerializable } from "src/typing.utils";
import { IsString } from "class-validator";
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

export class QueryWithPagingAndLangAndIdIn extends QueryWithPagingDto {
	lang?: Lang = Lang.en;
	pageSize?: number = 1000;
}

export class TransformDto {
	/**
	 * Language of fields that have multiple languages. If multi is selected fields that can have multiple languages will contain language objects. Defaults to 'en'
	 */
	lang?: Lang = Lang.en;
}

enum AcceptAccess {
	admin = "admin",
	editor = "editor"
}

export class AcceptAccessDto {
	/**
	 * Access type
	 */
	type?: AcceptAccess = AcceptAccess.editor;
}

export class RevokeAccessDto extends OmitType(AcceptAccessDto, ["type"]) {}

export type Hashed<T> = T & { "$id": string }
