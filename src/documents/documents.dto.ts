import { Document } from "@luomus/laji-schema";
import { ApiHideProperty, ApiProperty, IntersectionType, OmitType, PartialType, getSchemaPath } from "@nestjs/swagger";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { PagedDto, QueryWithPersonTokenDto } from "src/common.dto";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serialization/serialization.utils";
import { WithNonNullableKeys } from "src/typing.utils";
import { ErrorsObj, ValidationException } from "./document-validator/document-validator.utils";

export class GetDocumentsDto extends IntersectionType(
	PagedDto,
	QueryWithPersonTokenDto
) {
	/** Limit the list of documents to a certain observation year */
	@IsInt()
	@Type(() => Number)
	@IsOptional()
	observationYear?: number;

	// `@ApiProperty()` would be the best way to handle the query param renaming, but for some reason when it's combined
	// with @IsOptionalBoolean(), the value is always false. Thus, the renaming is done in the controller.
	// @ApiProperty({ name: "templates" })
	/**	Fetch only templates */
	@IsOptionalBoolean()
	templates?: boolean = false;

	/** Limit the list of documents to a certain named place */
	@ApiProperty({ name: "namedPlace" }) // Need both decorators for renaming.
	@Expose({ name: "namedPlace" })
	namedPlaceID?: string;
	/** Collection id. Child collections are also fetched. */
	collectionID?: string;
	/** Limit the list of documents to a certain source application. */
	sourceID?: string;
	/** Use this form's features for the request. */
	formID?: string;
	/** Comma separated list of field names to include in the response */
	@CommaSeparatedStrings() selectedFields?: (keyof Document)[];
}

export enum ValidationErrorFormat {
	remote = "remote",
	object = "object",
	jsonPointer = "jsonPointer",
	jsonPath = "jsonPath",
	dotNotation = "dotNotation"
}

export class CreateDocumentDto extends IntersectionType(
	QueryWithPersonTokenDto
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
	: unknown is SecondaryDocumentDelete =>
	(unknown as any).delete && ("id" in unknown);

export const isSecondaryDocumentOperation = (document: Document | SecondaryDocumentOperation)
	: document is SecondaryDocumentOperation =>
	isSecondaryDocument(document) || isSecondaryDocumentDelete(document);

export type PopulatedSecondaryDocumentOperation =
	Populated<SecondaryDocument>
	| (SecondaryDocumentDelete & { formID: string; collectionID: string });

export type SecondaryDocumentDeleteResponse = Pick<Document,
	"formID"
	| "id"
	| "sourceID"
	| "collectionID"
	| "creator"
	| "editor"
	| "dateEdited"
	| "dateCreated"
	| "publicityRestrictions"> & {
	delete: true
}


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

export enum PublicityRestrictions {
	publicityRestrictionsPublic = "MZ.publicityRestrictionsPublic",
	publicityRestrictionsProtected = "MZ.publicityRestrictionsProtected",
	publicityRestrictionsPrivate = "MZ.publicityRestrictionsPrivate"
}

export enum DataOrigin {
	dataOriginPaperForm = "MY.dataOriginPaperForm",
	dataOriginWebForm = "MY.dataOriginWebForm",
	dataOriginSpreadsheetFile = "MY.dataOriginSpreadsheetFile"
}

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

export class BatchJobQueryDto extends IntersectionType(QueryWithPersonTokenDto) {
	validationErrorFormat?: Exclude<ValidationErrorFormat, "remote"> = ValidationErrorFormat.object;
	publicityRestrictions?: PublicityRestrictions;
	dataOrigin?: DataOrigin;
}

class BatchJobValidationStatus {
	processed = 0;
	total: number;

	@ApiProperty()
	@Expose()
	@Transform(({ obj } : {obj: BatchJobValidationStatus } ) => Math.floor(((obj.processed || 0) / obj.total) * 100))
	percentage: number;
};

export enum BatchJobStep {
	validate = "VALIDATE",
	send = "SEND",
}

export enum BatchJobPhase {
	validating = "VALIDATING",
	readyToComplete = "READY_TO_COMPLETE",
	completing = "COMPLETING",
	completed = "COMPLETED"
}

export class BatchJob<
	T extends Populated<Document> | PopulatedSecondaryDocumentOperation
	= Populated<Document> | PopulatedSecondaryDocumentOperation
> {
	id: string;

	@Type(() => BatchJobValidationStatus)
	status: BatchJobValidationStatus;

	personID: string;
	documents: T[];
	errors: (ValidationException | null)[] = [];
	step: BatchJobStep;

	@ApiProperty({ enum: Object.values(BatchJobPhase) }) @Expose() get phase(): BatchJobPhase {
		const { status } = this;
		if (this.step === BatchJobStep.validate) {
			return status.processed < status.total
				? BatchJobPhase.validating
				: BatchJobPhase.readyToComplete;
		} else {
			return status.processed < status.total
				? BatchJobPhase.completing
				: BatchJobPhase.completed;
		}
	}
}

export class BatchJobValidationStatusResponse extends OmitType(BatchJob, ["errors", "documents", "step"]) {
	id: string;
	documents?: Document[];
	@ApiHideProperty() @Exclude() personID: string;
	@ApiHideProperty() @Exclude() step: BatchJobStep;

	@ApiProperty({
		type: "array",
		items: {
			oneOf: [
				{ $ref: getSchemaPath(ErrorsObj) },
				{ type: "null" }
			]
		}
	})
	errors?: (ErrorsObj | null)[] = [];
}

export const isBatchJobDto = (job: any): job is { id: string, status: BatchJobValidationStatus } =>
	job.id && job.status;

export class QueryWithNamedPlaceDto {
	/** Limit the list of documents to a certain named place */
	@IsString() namedPlace: string;
}

export class GetCountDto extends IntersectionType(
	PartialType(QueryWithNamedPlaceDto),
	QueryWithPersonTokenDto
) {
	/** Limit the list of documents to a certain collection */
	collectionID?: string;

	/** Limit the list of documents to a certain form */
	formID?: string;
}

export class DocumentCountItemResponse {
	year: string;
	count: number;
}

export class StatisticsResponse {
	dateMedian: string;
}
