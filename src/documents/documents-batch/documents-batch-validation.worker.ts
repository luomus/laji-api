import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable } from "@nestjs/common";
import { getDocumentsCacheKey } from "./documents-batch.service";
import {
	DataOrigin, isSecondaryDocumentDelete, isSecondaryDocument,
	ValidationJobPayload, JobResult, Populated, PopulatedSecondaryDocumentOperation,
	SecondaryDocumentOperation
} from "../documents.dto";
import { ApiUsersService } from "src/api-users/api-users.service";
import { PersonsService } from "src/persons/persons.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { Document } from "@luomus/laji-schema";
import { ValidationException, isValidationExceptionBase, PreTranslatedDetailsValidationException }
	from "../document-validator/document-validator.utils";
import { DocumentsService, populateCreatorAndEditorMutably } from "../documents.service";
import { SecondaryDocumentsService } from "../secondary-documents.service";
import { Person } from "src/persons/person.dto";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { DocumentValidatorService } from "../document-validator/document-validator.service";
import { Lang } from "src/common.dto";

const CHUNK_SIZE = 25;

@Processor("documents-validation")
@Injectable()
export class DocumentsBatchValidationWorker extends WorkerHost {

	constructor(
		private personsService: PersonsService,
		private apiUsersService: ApiUsersService,
		private cache: RedisCacheService,
		private documentsService: DocumentsService,
		private secondaryDocumentsService: SecondaryDocumentsService,
		private documentValidatorService: DocumentValidatorService
	) {
		super();
	}

	async process(job: Job<ValidationJobPayload>) {
		const { personID, systemID, lang } = job.data;
		const cacheKey = getDocumentsCacheKey(job.id!, personID);

		const person = await this.personsService.get(personID);
		const apiUser = await this.apiUsersService.getBySystemID(systemID);

		const total = await this.cache.lLen(cacheKey);
		let processed = 0;

		const results: JobResult = [];

		for (let start = 0; start < total; start += CHUNK_SIZE) {
			const end = start + CHUNK_SIZE - 1;

			const chunkDocs = await this.cache.lRange(cacheKey, start, end);

			for (let i = 0; i < chunkDocs.length; i++) {
				const docIndex = start + i;

				const populated = await this.populateDocument(chunkDocs[i], person, apiUser);
				const validation = await this.validate(populated, person, lang);

				results.push(validation);

				await this.cache.lSet(cacheKey, docIndex, populated);

				processed++;
			}
			await job.updateProgress(processed);
		}
		await job.updateProgress(processed);
		return results;
	}

	private populateDocument(
		document: Document | SecondaryDocumentOperation,
		person: Person,
		apiUser: ApiUserEntity
	) {
		return isSecondaryDocumentDelete(document)
			? this.secondaryDocumentsService.populateMutably(document, person)
			: this.documentsService.populateMutably(document, apiUser, person);
	}

	private async validate(
		document: PopulatedSecondaryDocumentOperation | Populated<Document>,
		person: Person,
		lang: Lang
	) {
		const formIDs = new Set();

		try {
			if (!isSecondaryDocumentDelete(document) && !document.dataOrigin) {
				document.dataOrigin = [DataOrigin.dataOriginSpreadsheetFile];
			}

			if (!isSecondaryDocumentDelete(document)) {
				populateCreatorAndEditorMutably(document, person);
			}

			formIDs.add(document.formID);
			if (formIDs.size > 1) {
				throw new ValidationException({ "": ["DOCUMENT_VALIDATION_BATCH_SAME_FORM_ID"] });
			}

			if (!isSecondaryDocumentDelete(document) && !isSecondaryDocument(document)) {
				await this.documentValidatorService.validate(document, person, undefined, lang);
			} else {
				await this.secondaryDocumentsService.validate(document, person, lang);
			}

			return null;

		} catch (e) {
			return isValidationExceptionBase(e)
				? e
				: new PreTranslatedDetailsValidationException({
					"": [`Failed due to internal error: ${e.message}`]
				});
		}
	}
}
