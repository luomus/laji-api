import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Document } from "@luomus/laji-schema";
import { DocumentValidatorService } from "../document-validator/document-validator.service";
import { DocumentsService } from "../documents.service";
import { PersonsService } from "src/persons/persons.service";
import { BatchJob, Populated, PopulatedSecondaryDocumentOperation, SecondaryDocument, SecondaryDocumentOperation,
	ValidationErrorFormat, BatchJobValidationStatusResponse, isSecondaryDocumentDelete } from "../documents.dto";
import { ValidationException, formatErrorDetails, isValidationException }
	from "../document-validator/document-validator.utils";
import { firstFromNonEmptyArr, uuid } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { Person } from "src/persons/person.dto";
import { serializeInto } from "src/serializing/serializing";
import { FormsService } from "src/forms/forms.service";
import { SecondaryDocumentsService } from "../secondary-documents.service";

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
		personToken: string,
		accessToken: string
	): Promise<BatchJobValidationStatusResponse>  {
		const person = await this.personsService.getByToken(personToken);

		const job: BatchJob = {
			id: uuid(6),
			personID: person.id,
			 // 'as' because they'll be populated after job creation.
			documents: documents as Populated<Document>[],
			processed: 0,
			errors: new Array(documents.length)
		};
		await this.updateJobInCache(job);

		const processes = asChunks(documents, CHUNK_SIZE).map(async (documentChunks, idx) => {
			const chunkErrors = await Promise.all(
				await this.createValidationProcess(documentChunks, job, personToken, accessToken)
			);
			job.errors.splice(idx * CHUNK_SIZE, CHUNK_SIZE, ...chunkErrors);
		});
		// The validation error format parameter doesn't matter, since there are no errors yet.
		const status = exposeJobStatus(job);
		void this.process(processes, job);
		return status;
	}

	async getStatus(
		jobID: string,
		personToken: string,
		validationErrorFormat: ValidationErrorFormat
	): Promise<BatchJobValidationStatusResponse> {
		const person = await this.personsService.getByToken(personToken);
		const job = await this.cache.get<BatchJob>(getCacheKey(jobID, person));
		if (!job) {
			throw new HttpException("Job not found", 404);
		}
		return exposeJobStatus(job, validationErrorFormat);
	}

	/** Creates the documents of a given job if it's processed and valid, sending them to store or warehouse. */
	async complete(
		jobID: string,
		personToken: string,
		validationErrorFormat: ValidationErrorFormat
	): Promise<BatchJobValidationStatusResponse> {
		const person = await this.personsService.getByToken(personToken);
		let job = await this.cache.get<BatchJob | undefined>(getCacheKey(jobID, person));

		if (!job) {
			throw new HttpException("No job found", 404);
		}

		if (job.import) {
			return exposeJobStatus(job, validationErrorFormat);
		}

		if (job.errors.some(e => e !== null)) {
			throw new HttpException("The job has validation errors. Fix the documents and create a new job", 422);
		}

		job = {
			...job,
			import: true,
			processed: 0,
			errors: []
		};
		await this.updateJobInCache(job);
		void this.createSendProcess(job, personToken);
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
		personToken: string,
		accessToken: string
	) {
		const formIDs = new Set();
		const person = await this.personsService.getByToken(personToken);
		return documents.map(async document => {
			try {
				const populatedDocument = await (isSecondaryDocumentDelete(document)
					? this.secondaryDocumentsService.populateMutably(document, person, accessToken)
					: this.documentsService.populateMutably(document, person, accessToken));

				formIDs.add(populatedDocument.formID);
				if (formIDs.size > 1) {
					throw new ValidationException({ "/": ["All documents must have the same formID"] });
				}

				if (!isSecondaryDocumentDelete(populatedDocument)) {
					await this.documentValidatorService.validate(populatedDocument);
				} else {
					await this.secondaryDocumentsService.validate(populatedDocument, personToken);
				}
				job.processed++;
				return null;
			} catch (e) {
				job.processed++;
				return isValidationException(e)
					? e
					: new ValidationException({ "/": [`Failed due to internal error: ${e.message}`] });
			}
		});
	}

	private async createSendProcess(job: BatchJob, personToken: string) {
		const documentSample = firstFromNonEmptyArr(job.documents);
		const form = await this.formsService.get(documentSample.formID);
		if (form.options?.secondaryCopy) {
			try {
				await this.secondaryDocumentsService.pushMultiple(
					job.documents as PopulatedSecondaryDocumentOperation[]
				);
			} catch (e) {
				job.errors = Array(job.documents.length).fill(
					new ValidationException({ "/": ["Upload to the warehouse failed"] })
				);
			}
		} else {
			try {
				job.documents = await this.documentsService.store.post<Document[], Document[]>(
					undefined, job.documents as Populated<Document>[]
				) as Populated<Document>[];
			} catch (e) {
				let message = "Upload to store failed.";
				if (e.error) {
					message += ` Combined error is: ${e.error}`;
				}
				job.errors = Array(job.documents.length).fill(new ValidationException({ "/": [message] }));
			}
		}

		const docsWithNamedPlace = job.documents.filter(
			document => (document as Document).namedPlaceID
		) as (Document | SecondaryDocument)[];

		job.processed = job.documents.length - docsWithNamedPlace.length;
		await this.updateJobInCache(job);

		const processes = asChunks(docsWithNamedPlace, CHUNK_SIZE).map(async documentChunks =>
			await this.createSideEffectProcess(documentChunks, job, personToken));
		await this.process(processes, job);
		await this.flushDocumentsCache(job, docsWithNamedPlace);
		await this.updateJobInCache(job);
	}

	private async flushDocumentsCache(job: BatchJob, docsWithNamedPlace: (Document | SecondaryDocument)[]) {
		// Check if there are primary documents in the query, and flush the document cache with one of them. All the
		// documents have the same collectionID & creator, which are used as `primaryKeySpace`s for the document cache, so
		// this should sync the cache correct.
		const storeDocument = job.documents.find(d => !d.id && (d as Document).creator) as (Document | undefined);
		if (storeDocument) {
			const { collectionID, creator } = storeDocument;
			await this.documentsService.store.flushCache({ collectionID, creator, gatherings: [{ }] });
		}

		// `namedPlaceID` is also in the `primaryKeySpace` for documents. Unfortunately we must bust the cache for each place.
		if (docsWithNamedPlace.length) {
			await Promise.all(docsWithNamedPlace.map(async ({ namedPlaceID, id: isWarehouseDocument }) =>
				!isWarehouseDocument
					&& await this.documentsService.store.flushCache({ namedPlaceID, gatherings: [{ }] })
			));
		}
	}

	private async createSideEffectProcess(documents: Document[], job: BatchJob, personToken: string) {
		await Promise.all(documents.map(async document => {
			try {
				await this.documentsService.namedPlaceSideEffects(
					document as Populated<Document> & { id: string },
					personToken
				);
			} catch (e) {
				this.logger.error(`Named place side effect failed for ${document.id}`);
			} finally {
				job.processed++;
			}
		}));
	}

	async updateJobInCache(job: BatchJob) {
		return this.cache.set(getCacheKey(job.id, await this.personsService.getByPersonId(job.personID)), job);
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
	const { processed, ...restOfJob } = job;
	const exposedJob = serializeInto(BatchJobValidationStatusResponse)(restOfJob);
	const total = job.documents.length;
	exposedJob.status = {
		processed,
		total,
		percentage: Math.floor((processed / total) * 100)
	};

	if (processed === job.documents.length) {
		exposedJob.errors = job.errors.map(e => e === null
			? e
			: formatErrorDetails((e as any).response.details, validationErrorFormat)
		);
		return exposedJob;
	}

	// Return only status for job that is still being processed.
	delete exposedJob.documents;
	delete exposedJob.errors;
	return exposedJob;
};
