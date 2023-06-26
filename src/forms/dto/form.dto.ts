import { Lang, PagedDto } from "src/common.dto";
export enum Format {
	schema = "schema",
	json = "json"
}
import { Form as FormI } from "laji-schema";
import { OmitType } from "@nestjs/swagger";

export class Form implements FormI {
	id?: string;
	name?: string;	
	fields?: any;	
	uiSchema?: any;	
	options: any;	
	translations?: any;	
	collectionID?: any;	
}

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

export class GetAllDto extends PagedDto {
	lang?: Lang = Lang.en;
}

export class QueryWithCollectionID {
	/**
	 * Collection id
	 */
	collectionID: string;
}

export class AcceptAccessDto {
	/**
	 * 	Person token who is authorised to accept requests
	 */
	personToken: string;

	/**
	 * Access type
	 */
	type: "editor" | "admin" = "editor";
}

export class RevokeAccessDto extends OmitType(AcceptAccessDto, ["type"]) {}
