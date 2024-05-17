import { Document } from "@luomus/laji-schema";
import { HttpException } from "@nestjs/common";
import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";
import { LangQueryDto, PagedDto, QueryWithPersonTokenDto } from "src/common.dto";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serializing/serializing";
import { WithNonNullableKeys } from "src/type-utils";

export class GetDocumentsDto extends IntersectionType(
	PagedDto,
	QueryWithPersonTokenDto
) {
	/** Limit the list of documents to a certain observation year */
	@IsInt()
	@Type(() => Number)
	@IsOptional()
	observationYear?: number;

	/**	Fetch only templates */
	@ApiProperty({ name: "templates" })
	@IsOptionalBoolean()
	isTemplate: boolean = false;

	/** Limit the list of documents to a certain named place */
	@ApiProperty({ name: "namedPlace" })
	namedPlaceID: string;
	/** Collection id. Child collections are also fetched. */
	collectionID: string;
	/** Limit the list of documents to a certain source application. */
	sourceID: string;
	/** Use this form's features for the request. Doesn't limit the limit of documents to this form ID! */
	formID: string;
	/** Comma separated list of field names to include in the response */
	@CommaSeparatedStrings() selectedFields?: (keyof Document)[];
}

export enum ValidationErrorFormat {
	remote = "remote",
	object = "object",
	jsonPath = "jsonPath"
}

export class CreateDocumentDto extends IntersectionType(
	PagedDto,
	QueryWithPersonTokenDto,
	LangQueryDto,
) {
	/** Format of validation error details */
	validationErrorFormat?: ValidationErrorFormat = ValidationErrorFormat.remote;
}

export const isNewPrimaryDocument = (unknown: Document | SecondaryDocumentOperation)
	: unknown is NewPrimaryDocument =>
	!(unknown as any).delete && !("id" in unknown);

export type NewPrimaryDocument = Omit<Document, "id">;

export type SecondaryDocument = Document & {"id": string };

export type SecondaryDocumentDelete = {
	id: string;
	delete: boolean;
	formID: string;
}

export type SecondaryDocumentOperation = SecondaryDocument | SecondaryDocumentDelete;

export const isSecondaryDocument = (unknown: Document | SecondaryDocumentOperation)
	: unknown is SecondaryDocument =>
	!(unknown as any).delete && "id" in unknown;

export const isSecondaryDocumentDelete = (unknown: Document | SecondaryDocumentOperation)
	: unknown is SecondaryDocumentDelete => {
	if (!(unknown as any).delete) {
		return false;
	}
	if (!("id" in unknown)) {
		throw new HttpException("Secondary document deletion missing id", 422);
	}
	if (!unknown.formID) {
		throw new HttpException("Secondary document deletion missing formID", 422);
	}
	return true;
};

export type Populated<T extends Document> = WithNonNullableKeys<T,
	"sourceID"
	| "formID"
	| "collectionID"
	| "publicityRestrictions"
	| "creator"
	| "editor"
	| "dateCreated"
	| "dateEdited"
>;

export type DatePopulated<T extends Document> = WithNonNullableKeys<T, "dateCreated" | "dateEdited">;

export enum ValidationStrategy {
	noExistingGatheringsInNamedPlace = "noExistingGatheringsInNamedPlace",
	wbcNamedPlaceExists = "wbcNamedPlaceExists",
	overlapWithNamedPlace = "overlapWithNamedPlace",
	uniqueNamedPlaceAlternativeIDs = "uniqueNamedPlaceAlternativeIDs",
	namedPlaceNotTooNearOtherPlaces = "namedPlaceNotTooNearOtherPlaces",
	waterbirdPairCount = "waterbirdPairCount",
	taxonBelongsToInformalTaxonGroup = "taxonBelongsToInformalTaxonGroup"
};

export enum ValidationType {
	error = "error",
	warning = "warning"
}

export class ValidateQueryDto extends IntersectionType(
	PartialType(QueryWithPersonTokenDto),
) {
	/** Json path of the field being validated (defaults to the whole document). */
	field?: string;
	/** Taxon belongs to informal taxon group only: Validate that taxon belongs to informal taxon group(s). Multiple values are separated by a comma (,). */
	@CommaSeparatedStrings() informalTaxonGroup?: string[];
	/** Name of the validator to run (default all specified in the form). */
	validator?: ValidationStrategy;
	/** Run validators of this type */
	type?: ValidationType = ValidationType.error;
	/** Format of validation error details */
	validationErrorFormat?: Exclude<ValidationErrorFormat, "remote"> = ValidationErrorFormat.object;
}
