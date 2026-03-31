import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable } from "@nestjs/common";
import { getDocumentsCacheKey } from "./documents-batch.service";
import {
	DataOrigin, isSecondaryDocument, isSecondaryDocumentDelete, JobPayload, JobResult, Populated,
	PopulatedSecondaryDocumentOperation, SecondaryDocumentOperation
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

	async process(job: Job<JobPayload>) {
		const { personID, systemID, lang } = job.data;
		const documents = (await this.cache.get<(Document | SecondaryDocumentOperation)[]>(
			getDocumentsCacheKey(job.id!, personID))
		)!;
		const person = await this.personsService.get(personID);
		const apiUser = await this.apiUsersService.getBySystemID(systemID);

		const result: JobResult = [];
		let progress = 0;

		for (const idx in documents) {
			const document = documents[idx]!;
			const populatedDocument = await this.populateDocument(document, person, apiUser);
			documents[idx] = populatedDocument;
			result.push(await this.validate(populatedDocument, person, lang));
			progress++;
			if (progress % 10 === 0) {
				await job.updateProgress(progress);
			}
		}
		await job.updateProgress(progress);
		await this.cache.set(getDocumentsCacheKey(job.id!, personID), documents);
		
		return result;
	}

	private async populateDocument(
		document: Document | SecondaryDocumentOperation,
		person: Person,
		apiUser: ApiUserEntity
	) {
		return await (isSecondaryDocumentDelete(document)
			? this.secondaryDocumentsService.populateMutably(document, person)
			: this.documentsService.populateMutably(document, apiUser, person));
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
				: new PreTranslatedDetailsValidationException(
					{ "": [`Failed due to internal error: ${e.message}`] }
				);
		}
	}
}
