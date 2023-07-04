import { Lang, PagedDto } from "src/common.dto";
export enum Format {
	schema = "schema",
	json = "json"
}
import { Form as FormI } from "laji-schema";
import { OmitType } from "@nestjs/swagger";

export type Form = FormI & {
	id: string;
	options: NonNullable<FormI["options"]>
};	

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
	pageSize?: number = 1000;
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
