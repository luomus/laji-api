import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { allowedQueryKeys, DocumentsService } from "./documents.service";
import { Body, Get, HttpCode, HttpException, Param, Post, Query, Req } from "@nestjs/common";
import { CreateDocumentDto, GetDocumentsDto, isSecondaryDocument, isSecondaryDocumentDelete, SecondaryDocumentOperation,
	UnpopulatedDocument, ValidateQueryDto, ValidationStrategy } from "./documents.dto";
import { PaginatedDto } from "src/pagination";
import { Document } from "./documents.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { whitelistKeys } from "src/utils";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { AccessTokenService } from "src/access-token/access-token.service";
import { Request } from "express";
import { SecondaryDocumentsService } from "./secondary-documents.service";
import { FormsService } from "src/forms/forms.service";
import { DocumentValidatorService } from "./document-validator/document-validator.service";
import { ApiTags } from "@nestjs/swagger";
import { PersonsService } from "src/persons/persons.service";

@ApiTags("Documents")
@LajiApiController("documents")
export class DocumentsController {
	constructor(
		private documentsService: DocumentsService,
		private documentValidatorService: DocumentValidatorService,
		private accessTokenService: AccessTokenService,
		private secondaryDocumentsService: SecondaryDocumentsService,
		private formsService: FormsService,
		private personsService: PersonsService
	) {}

	/** Validate */
	@Post("validate")
	@HttpCode(200)
	async validate(
		@Body() document: Document,
		@Req() request: Request,
		@Query() query: ValidateQueryDto
	): Promise<unknown> {
		const { validator, personToken } = query;
		if (validator) {
			return this.documentValidatorService.validateWithValidationStrategy(
				document, query as ValidateQueryDto & { validator: ValidationStrategy }
			);
		} else {
			if (!personToken) {
				throw new HttpException("Person token is required when validating the whole document", 422);
			}
			const person = await this.personsService.getByToken(personToken);
			// `!` is valid to use because it can't be undefined at this point, as the access-token.guard would have raised an
			// error already.
			const accessToken = this.accessTokenService.findAccessTokenFromRequest(request)!;
			await this.documentsService.populateDocumentMutably(document, person, accessToken);
			return this.documentValidatorService.validate(document);
		}
	}

	/** Get a page of documents */
	@Get()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	getPage(@Query() query: GetDocumentsDto): Promise<PaginatedDto<Document>> {
		const { personToken, page, pageSize, selectedFields, observationYear, ...q } = query;
		return this.documentsService.getPageByObservationYear(
			whitelistKeys(q, allowedQueryKeys),
			personToken,
			observationYear,
			page,
			pageSize,
			selectedFields
		);
	}

	/** Get a document */
	@Get(":id")
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	get(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto): Promise<Document> {
		return this.documentsService.get(id, personToken);
	}

	/** Create a new document */
	@Post()
	@SwaggerRemoteRef({ source: "store", ref: "document" })
	async create(
		@Body() document: UnpopulatedDocument | SecondaryDocumentOperation,
		@Req() request: Request,
		@Query() { personToken, validationErrorFormat }: CreateDocumentDto
	): Promise<Document> {
		// `!` is valid to use because it can't be undefined at this point, as the access-token.guard would have raised an
		// error already.
		const accessToken = this.accessTokenService.findAccessTokenFromRequest(request)!;
		if (!document.formID) {
			throw new HttpException("Missing required property formID", 422);
		}
		const form = await this.formsService.get(document.formID);
		if (!form?.options?.secondaryCopy) {
			if (!isSecondaryDocument(document) && !isSecondaryDocumentDelete(document)) {
				throw new HttpException("Doesn't look like a secondary document", 422);
			}
			 // Does a query to warehouse in a way not documented by it's Swagger, hence any.
			return this.secondaryDocumentsService.create(document, personToken, accessToken) as any;
		}

		return this.documentsService.create(
			document as UnpopulatedDocument,
			personToken,
			accessToken,
			validationErrorFormat
		);
	}
}
