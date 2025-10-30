import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Document } from "@luomus/laji-schema";
import { DocumentValidatorService } from "../document-validator/document-validator.service";
import { DocumentsService, populateCreatorAndEditorMutably } from "../documents.service";
import { PersonsService } from "src/persons/persons.service";
import {
	BatchJob, Populated, PopulatedSecondaryDocumentOperation, SecondaryDocument, SecondaryDocumentOperation,
	ValidationErrorFormat, BatchJobValidationStatusResponse, isSecondaryDocumentDelete, isSecondaryDocument,
	PublicityRestrictions, DataOrigin, BatchJobPhase, BatchJobStep
} from "../documents.dto";
import { PreTranslatedDetailsValidationException, ValidationException, formatErrorDetails, isValidationExceptionBase }
	from "../document-validator/document-validator.utils";
import { firstFromNonEmptyArr, uuid } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { Person } from "src/persons/person.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { FormsService } from "src/forms/forms.service";
import { SecondaryDocumentsService } from "../secondary-documents.service";
import { ApiUserEntity } from "src/api-users/api-user.entity";

const CHUNK_SIZE = 10;

@Injectable()
export class DocumentsBatchService {

	private logger = new Logger(DocumentsBatchService.name);

	constructor(
		private personsService: PersonsService,
		private documentsService: DocumentsService,
		private documentValidatorService: DocumentValidatorService,
		private cache: RedisCacheService,
		private formsService: FormsService,
		private secondaryDocumentsService: SecondaryDocumentsService
	) {}

	/** Creates a job that validates the given documents, returning a job status. */
	async start(
		documents: Document[],
		person: Person,
		apiUser: ApiUserEntity
	): Promise<BatchJobValidationStatusResponse>  {
		if (!documents.length) {
			throw new HttpException("Send at least one document", 422);
		}

		const job = serializeInto(BatchJob)({
			id: uuid(6),
			personID: person.id,
			 // 'as' because they'll be populated mutably after job creation.
			documents: documents as Populated<Document>[],
			errors: new Array(documents.length),
			step: BatchJobStep.validate,
			status: { total: documents.length }
		});
		await this.updateJobInCache(job);

		const processes = asChunks(job.documents, CHUNK_SIZE).map(async (chunkDocuments, idx) => {
			const chunkErrors = await Promise.all(
				await this.createValidationProcess(chunkDocuments, job, person, apiUser)
			);
			job.errors.splice(idx * CHUNK_SIZE, CHUNK_SIZE, ...chunkErrors);
		});
		// The validation error format parameter (2nd parameter) doesn't matter, since there are no errors yet.
		const status = exposeJobStatus(job);
		void this.process(processes, job);
		return status;
	}

	async getStatus(
		jobID: string,
		person: Person,
		validationErrorFormat: ValidationErrorFormat
	): Promise<BatchJobValidationStatusResponse> {
		const job = await this.getJobFromCache(jobID, person);
		if (!job) {
			throw new HttpException("Job not found", 404);
		}
		return exposeJobStatus(job, validationErrorFormat);
	}

	/** Creates the documents of a given job if it's processed and valid, sending them to store or warehouse. */
	async complete(
		jobID: string,
		person: Person,
		validationErrorFormat: ValidationErrorFormat,
		publicityRestrictions?: PublicityRestrictions,
		dataOrigin?: DataOrigin
	): Promise<BatchJobValidationStatusResponse> {
		let job = await this.getJobFromCache(jobID, person);

		if (!job) {
			throw new HttpException("No job found", 404);
		}

		if (job.phase === BatchJobPhase.validating) {
			throw new HttpException("The job is still processing validation", 422);
		}

		// TODO REMOVE_AFTER_#36 - we must keep this for now to keep bw compatibility {
		if (job.phase === BatchJobPhase.completing || job.phase === BatchJobPhase.completed) {
			return exposeJobStatus(job, validationErrorFormat);
		}
		// } TODO REPLACE_WITH_AFTER_#36 {
		// throw new HttpException("The job is still processing the sending", 422);
		// }
		// if (job.phase === BatchJobPhase.completed) {
		// 	throw new HttpException("The job is already completed", 422);
		// }
		// }

		if (job.errors.some(e => e !== null)) {
			throw new HttpException("The job has validation errors. Fix the documents and create a new job", 422);
		}

		job = serializeInto(BatchJob)({
			...job,
			status: { total: job.documents.length },
			step: BatchJobStep.send,
		});

		if (publicityRestrictions || dataOrigin) {
			job.documents.forEach(document => {
				if (isSecondaryDocumentDelete(document))  {
					return;
				}
				if (dataOrigin) {
					document.dataOrigin = [dataOrigin];
				}
				if (publicityRestrictions) {
					document.publicityRestrictions = publicityRestrictions;
				}
			});
		}

		await this.updateJobInCache(job);
		void this.createSendProcess(job, person);
		return exposeJobStatus(job, validationErrorFormat);
	}

	private async process(processes: Promise<void>[], job: BatchJob) {
		for (const process of processes) {
			await process;
			await this.updateJobInCache(job);
		}
	}

	private async createValidationProcess(
		documents: (Document | SecondaryDocumentOperation)[],
		job: BatchJob,
		person: Person,
		apiUser: ApiUserEntity
	) {
		const formIDs = new Set();
		return documents.map(async document => {
			try {
				const populatedDocument = await (isSecondaryDocumentDelete(document)
					? this.secondaryDocumentsService.populateMutably(document, person)
					: this.documentsService.populateMutably(document, apiUser, person));

				if (!isSecondaryDocumentDelete(populatedDocument) && !populatedDocument.dataOrigin) {
					populatedDocument.dataOrigin = [DataOrigin.dataOriginSpreadsheetFile];
				}

				if (!isSecondaryDocumentDelete(populatedDocument)) {
					populateCreatorAndEditorMutably(populatedDocument, person);
				}

				formIDs.add(populatedDocument.formID);
				if (formIDs.size > 1) {
					throw new ValidationException({ "": ["DOCUMENT_VALIDATION_BATCH_SAME_FORM_ID"] });
				}

				if (!isSecondaryDocumentDelete(populatedDocument) && !isSecondaryDocument(populatedDocument)) {
					await this.documentValidatorService.validate(populatedDocument, person);
				} else {
					await this.secondaryDocumentsService.validate(populatedDocument, person);
				}
				job.status.processed++;
				return null;
			} catch (e) {
				job.status.processed++;
				return isValidationExceptionBase(e)
					? e
					: new PreTranslatedDetailsValidationException(
						{ "": [`Failed due to internal error: ${e.message}`] }
					);
			}
		});
	}

	private async createSendProcess(job: BatchJob, person: Person) {
		const documentSample = firstFromNonEmptyArr(job.documents);
		const form = await this.formsService.get(documentSample.formID);
		if (form.options?.secondaryCopy) {
			try {
				await this.secondaryDocumentsService.pushMultiple(
					job.documents as PopulatedSecondaryDocumentOperation[]
				);
			} catch (e) {
				job.errors = Array(job.documents.length).fill(
					new ValidationException({ "": ["DOCUMENT_VALIDATION_BATCH_WAREHOUSE_UPLOAD_FAILED"] })
				);
			} finally {
				job.status.processed = job.documents.length;
			}
		} else {
			try {
				job.documents = await this.documentsService.store.post<Populated<Document>[], Populated<Document>[]>(
					undefined, job.documents as Populated<Document>[]
				);

				const docsWithNamedPlace = job.documents.filter(
					document => (document as Document).namedPlaceID
				) as (Document | SecondaryDocument)[];

				job.status.processed = job.documents.length - docsWithNamedPlace.length;
				await this.updateJobInCache(job);

				const processes = asChunks(docsWithNamedPlace, CHUNK_SIZE).map(async chunkDocuments =>
					await this.createSideEffectProcess(
						chunkDocuments, job as BatchJob<Populated<Document>>, person
					)
				);
				await this.process(processes, job);
				await this.flushDocumentsCache(job as BatchJob<Populated<Document>>, docsWithNamedPlace);
			} catch (e) {
				let message = "Upload to store failed.";
				if (e.error) {
					message += ` Combined error is: ${e.error}`;
				}
				job.errors = Array(job.documents.length).fill(
					new PreTranslatedDetailsValidationException({ "": [message] })
				);
			}
		}

		await this.updateJobInCache(job);
	}

	private async flushDocumentsCache(job: BatchJob<Populated<Document>>, docsWithNamedPlace: Document[]) {
		// Check if there are primary documents in the query, and flush the document cache with one of them. All the
		// documents have the same collectionID & creator, which are used as `primaryKeySpace`s for the document cache, so
		// this should sync the cache correct.
		const documentSample = job.documents.find(d => d.creator) as (Document | undefined);
		if (documentSample) {
			const { collectionID, creator } = documentSample;
			await this.documentsService.store.flushCache({ collectionID, creator });
		}

		// `namedPlaceID` is also in the `primaryKeySpace` for documents. Unfortunately we must bust the cache for each place.
		if (docsWithNamedPlace.length) {
			await Promise.all(docsWithNamedPlace.map(async ({ namedPlaceID, id: isWarehouseDocument }) =>
				!isWarehouseDocument
					&& await this.documentsService.store.flushCache({ namedPlaceID, gatherings: [{ }] })
			));
		}
	}

	private async createSideEffectProcess(
		documents: Document[],
		job: BatchJob<Populated<Document>>,
		person: Person
	) {
		await Promise.all(documents.map(async document => {
			try {
				await this.documentsService.namedPlaceSideEffects(
					document as Populated<Document> & { id: string },
					person
				);
			} catch (e) {
				this.logger.error(`Named place side effect failed for ${document.id}`);
			} finally {
				job.status.processed++;
			}
		}));
	}

	async updateJobInCache(job: BatchJob) {
		return this.cache.set(getCacheKey(job.id, await this.personsService.get(job.personID)), job);
	}

	async getJobFromCache(id: string, person: Person) {
		return serializeInto(BatchJob)(await this.cache.get<BatchJob | undefined>(getCacheKey(id, person)));
	}
}

const asChunks = <T>(items: T[], chunkSize: number) => {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += chunkSize) {
		chunks.push(items.slice(i, i + chunkSize));
	}
	return chunks;
};

const getCacheKey = (jobID: string, person: Person) => ["DOCJOB", person.id, jobID].join(":");

const exposeJobStatus = (job: BatchJob, validationErrorFormat?: ValidationErrorFormat) => {
	const exposedJob = serializeInto(BatchJobValidationStatusResponse)(job);

	if (exposedJob.phase !== BatchJobPhase.completed) {
		delete exposedJob.documents;
	}

	if (job.status.processed === job.documents.length) {
		exposedJob.errors = job.errors.map(e => e === null
			? e
			: formatErrorDetails((e as any).response.details, validationErrorFormat)
		);
		return exposedJob;
	}

	// Return only status for job that is still being processed.
	return exposedJob;
};
