import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { allowedQueryKeysForExternalAPI, DocumentsService } from "./documents.service";
import { Body, Delete, Get, HttpCode, HttpException, Param, Post, Put, Query, UseFilters } from "@nestjs/common";
import { BatchJobQueryDto, CreateDocumentDto, DocumentCountItemResponse, GetCountDto, GetDocumentsDto,
	isSecondaryDocument, isSecondaryDocumentDelete, QueryWithNamedPlaceDto, SecondaryDocument,
	SecondaryDocumentOperation, StatisticsResponse, ValidateQueryDto, ValidationErrorFormat,
	BatchJobValidationStatusResponse, ValidationStrategy, isBatchJobDto } from "./documents.dto";
import { PaginatedDto } from "src/pagination";
import { Document } from "@luomus/laji-schema";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { whitelistKeys } from "src/utils";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { SecondaryDocumentsService } from "./secondary-documents.service";
import { FormsService } from "src/forms/forms.service";
import { DocumentValidatorService } from "./document-validator/document-validator.service";
import { ApiTags } from "@nestjs/swagger";
import { DocumentsBatchService } from "./documents-batch/documents-batch.service";
import { StoreDeleteResponse } from "src/store/store.dto";
import { ValidatiorErrorFormatFilter } from "./validatior-error-format/validatior-error-format.filter";
import { ValidationException } from "./document-validator/document-validator.utils";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { ApiUser } from "src/decorators/api-user.decorator";
import { ApiUserEntity } from "src/api-users/api-user.entity";

@ApiTags("Documents")
@UseFilters(ValidatiorErrorFormatFilter)
@LajiApiController("documents")
export class DocumentsController {
	constructor(
		private documentsService: DocumentsService,
		private documentValidatorService: DocumentValidatorService,
		private secondaryDocumentsService: SecondaryDocumentsService,
		private formsService: FormsService,
		private documentsBatchService: DocumentsBatchService,
		private personsService: PersonsService
	) {}

	/**
	 * Starts a batch job that validates the documents. Use the returned job id to get the status of the job with GET
	 * /documents/:jobID, or create the documents with POST /documents/batch/:jobID
	 * */
	@Post("batch")
	@HttpCode(200)
	async startBatchJob(
		@Body() documents: Document[],
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person,
		@ApiUser() apiUser: ApiUserEntity
	): Promise<BatchJobValidationStatusResponse> {
		return this.documentsBatchService.start(documents, person, apiUser);
	}

	/**
	 * Get a batch job's status. Once ready, the response will include properties 'documents' and 'errors', where the
	 * errors match the documents array indices, null meaning valid and an object.
	 * */
	@Get("batch/:jobID")
	// Makes the BatchJobValidationStatusResponse use store documents' swagger def. Modifies the definition which is
	// referenced by other controller methods using it (`startBatchJob`, `completeBatchJob`), so it needs to be done only
	// once.
	@SwaggerRemoteRef({ source: "store", ref: "document", replacePointer: "/properties/documents/items" })
	@HttpCode(200)
	async getBatchJobStatus(
		@Param("jobID") jobID: string,
		@Query() { validationErrorFormat = ValidationErrorFormat.object }: BatchJobQueryDto,
		@PersonToken() person: Person
	): Promise<BatchJobValidationStatusResponse> {
		return this.documentsBatchService.getStatus(jobID, person, validationErrorFormat);
	}

	/**
	 * Completes a given batch job by sending them to the store/warehouse. The batch job must be already validated.
	 * */
	@Post("batch/:jobID")
	@HttpCode(200)
	async completeBatchJob(
		@Param("jobID") jobID: string,
		@Query() { validationErrorFormat = ValidationErrorFormat.object }: BatchJobQueryDto,
		@PersonToken() person: Person
	): Promise<BatchJobValidationStatusResponse> {
		return this.documentsBatchService.complete(jobID, person, validationErrorFormat);
	}

	/** Validate a document */
	@Post("validate")
	@HttpCode(200)
	async validate(
		@Body() document: Document,
		@Query() query: ValidateQueryDto,
		@ApiUser() apiUser: ApiUserEntity
	): Promise<unknown> {
		const { validator, personToken, validationErrorFormat, type } = query;
		if (validator) {
			return this.documentValidatorService.validateWithValidationStrategy(
				document, query as ValidateQueryDto & { validator: ValidationStrategy }
			);
		} else {
			// Backward compatibility with old API, where batch jobs are handled by this endpoint.
			if (document instanceof Array) {
				if (!personToken) {
					throw new HttpException("Person token is required for batch operation", 422);
				}
				const person = await this.personsService.getByToken(personToken);
				return this.documentsBatchService.start(document, person, apiUser);
			} else if (isBatchJobDto(document)) {
				if (!personToken) {
					throw new HttpException("Person token is required for batch operation", 422);
				}
				const person = await this.personsService.getByToken(personToken);
				return this.documentsBatchService.getStatus(
					document.id,
					person,
					 // '!' is valid here, because DTO classes must have '?' modifier for properties with defaults, making the
					// typings bit awkward.
					validationErrorFormat!
				);
			}

			if (!document.formID) {
				throw new ValidationException({ "/formID": ["Missing required param formID"] });
			}

			const form = await this.formsService.get(document.formID);

			if (form?.options?.secondaryCopy) {
				if (!isSecondaryDocument(document) && !isSecondaryDocumentDelete(document)) {
					throw new HttpException(
						"Secondary document should have 'id' property, (and 'delete' if it's a deletion)",
						422);
				}
				const populated = await this.secondaryDocumentsService.populateMutably(
					document as SecondaryDocument,
					undefined,
					apiUser
				);
				if (!personToken) {
					throw new HttpException("Person token is for batch operation", 422);
				}
				const person = await this.personsService.getByToken(personToken);
				return this.secondaryDocumentsService.validate(populated, person) as unknown as Promise<Document>;
			}

			const populatedDocument = await this.documentsService.populateMutably(document, undefined, apiUser);
			return this.documentValidatorService.validate(populatedDocument, type!);
		}
	}

	/** Get count of documents by type (currently just "byYear") */
	@Get("count/byYear")
	getCountByYear(
		@Query() { collectionID, namedPlace, formID }: GetCountDto,
		@PersonToken() person: Person
	) : Promise<DocumentCountItemResponse[]> {
		return this.documentsService.getCountByYear(
			person,
			collectionID,
			namedPlace,
			formID
		);
	}

	/** Get the median date of documents for a named place */
	@Get("stats")
	getStatistics(@Query() query: QueryWithNamedPlaceDto): Promise<StatisticsResponse> {
		console.log(query);
		return this.documentsService.getStatistics(query.namedPlace);
	}

	/** Get a page of documents */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	getPage(@Query() query: GetDocumentsDto, @PersonToken() person: Person): Promise<PaginatedDto<Document>> {
		const { page, pageSize, selectedFields, observationYear, ...q } = fixTemplatesQueryParam(query);
		return this.documentsService.getPage(
			whitelistKeys(q, allowedQueryKeysForExternalAPI),
			person,
			observationYear,
			page,
			pageSize,
			selectedFields
		);
	}

	/** Get a document */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	get(@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<Document> {
		return this.documentsService.get(id, person);
	}

	// TODO need to add swagger customization to get the whole MY.document schema for the body.
	/** Create a new document */
	@Post()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	async create(
		@Body() document: Document,
		@Query() { validationErrorFormat }: CreateDocumentDto,
		@PersonToken() person: Person,
		@ApiUser() apiUser: ApiUserEntity
	): Promise<Document> {
		console.log(apiUser);
		if (isBatchJobDto(document)) {
			// 	 // '!' is valid here, because DTO classes must have '?' modifier for properties with defaults, making the
			// 	// typings a bit awkward.
			return this.documentsBatchService.complete(
				document.id,
				person,
				validationErrorFormat!
			) as any;
		}
		if (!document.formID) {
			throw new ValidationException({ "/formID": ["Missing required param formID"] });
		}
		const form = await this.formsService.get(document.formID);
		if (form?.options?.secondaryCopy) {
			if (!isSecondaryDocument(document) && !isSecondaryDocumentDelete(document)) {
				throw new HttpException(
					"Secondary document should have 'id' property, (and 'delete' if it's a deletion)",
					422);
			}
			// The return type for secondary document deletion isn't actually Document. This remains undocumented by our
			// Swagger document.
			return this.secondaryDocumentsService.create(document as SecondaryDocument, person, apiUser) as
				unknown as Promise<Document>;
		}

		return this.documentsService.create(
			document as Document,
			person,
			apiUser
		);
	}

	/** Update an existing document */
	@Put(":id")
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	async update(
		@Param("id") id: string,
		@Body() document: Document | SecondaryDocumentOperation,
		@Query() _: CreateDocumentDto,
		@PersonToken() person: Person,
		@ApiUser() apiUser: ApiUserEntity
	): Promise<Document> {
		if (!document.formID) {
			throw new ValidationException({ "/formID": ["Missing required property formID"] });
		}

		const form = await this.formsService.get(document.formID);
		if (form?.options?.secondaryCopy) {
			// eslint-disable-next-line max-len
			throw new HttpException("This document is for a form that is for secondary data. Use the POST endpoint instead if PUT.", 422);
		}

		return this.documentsService.update(
			id,
			document as Document,
			person,
			apiUser
		);
	}

	/** Update an existing document */
	@Delete(":id")
	async delete(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person
	): Promise<StoreDeleteResponse> {
		return this.documentsService.delete(id, person);
	}
}

/**
 * Renames `templates` as `isTemplate`. This would be better to handle in the GetDocumentsDto, but due to a bug in the
 * decorators we have to do it here. The `templates` name is inherited from the old API.
 */
const fixTemplatesQueryParam = <T extends { templates?: boolean }>(query: T) => {
	(query as any).isTemplate = query.templates;
	delete query.templates;
	return query as unknown as Omit<T, "templates"> & { isTemplate: boolean };
};
