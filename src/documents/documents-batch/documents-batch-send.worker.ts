import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { getDocumentsCacheKey } from "./documents-batch.service";
import {
	DataOrigin, isSecondaryDocumentDelete, Populated, PopulatedSecondaryDocumentOperation, PublicityRestrictions,
	SendJobPayload
}
	from "../documents.dto";
import { PersonsService } from "src/persons/persons.service";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { isStoreSchemaError, toValidationDetail } from "src/filters/store-validation.filter";
import { firstFromNonEmptyArr } from "src/utils";
import { ValidationException, PreTranslatedDetailsValidationException }
	from "../document-validator/document-validator.utils";
import { FormsService } from "src/forms/forms.service";
import { DocumentsService } from "../documents.service";
import { SecondaryDocumentsService } from "../secondary-documents.service";
import { Document } from "@luomus/laji-schema";

@Processor("documents-send")
@Injectable()
export class DocumentsBatchSendWorker extends WorkerHost {

	private logger = new Logger(DocumentsBatchSendWorker.name);

	constructor(
		private personsService: PersonsService,
		private cache: RedisCacheService,
		private secondaryDocumentsService: SecondaryDocumentsService,
		private documentsService: DocumentsService,
		private formsService: FormsService
	) {
		super();
	}

	async process(job: Job<SendJobPayload>) {
		this.logger.log(`SEND START job=${job.id} pid=${process.pid}`);
		const { personID, publicityRestrictions, dataOrigin } = job.data;

		const documents = await this.getJobDocuments(job.id!, personID);
		await this.cache.del(getDocumentsCacheKey(job.id!, personID));

		if (!documents || !documents.length) {
			this.logger.log(`NO DOCUS FOUND FOR job=${job.id} pid=${process.pid}`);
			throw new HttpException("The job is in invalid state. Start again.", 422);
		}
		assignExtrasMutably(documents, publicityRestrictions, dataOrigin);

		// DocumentsBatchService has already validated that all documents are for the same form.
		const sample = firstFromNonEmptyArr(documents);
		const form = await this.formsService.get(sample.formID);
		if (form.options?.secondaryCopy) {
			return this.sendToWarehouse(job, documents as unknown as PopulatedSecondaryDocumentOperation[]);
		} else {
			return this.sendToStore(job, documents as Populated<Document>[]);
		}
	}

	private async sendToWarehouse(job: Job, documents: PopulatedSecondaryDocumentOperation[]) {
		const { total } = job.data;
		try {
			await this.secondaryDocumentsService.pushMultiple(
				documents
			);
			await job.updateProgress(total);
			return [];
		} catch (e) {
			await job.updateProgress(total);
			return Array(documents.length).fill(
				new ValidationException({ "": ["DOCUMENT_VALIDATION_BATCH_WAREHOUSE_UPLOAD_FAILED"] })
			);
		}
	}

	private async sendToStore(job: Job, documents: Populated<Document>[]) {
		const { personID, total } = job.data;
		let sentDocuments: Populated<Document>[];
		try {
			sentDocuments = await this.documentsService.store.post<
				Populated<Document>[],
				Populated<Document>[]
			>(undefined, documents as Populated<Document>[]);
		} catch (e) {
			if (
				e.response?.data
				&& Array.isArray(e.response.data.error)
				&& Array.isArray(e.response.data.error[0])
				&& isStoreSchemaError(e.response.data.error[0][0])
			) {
				return e.response.data.error.map(
					(e: any) => new PreTranslatedDetailsValidationException(toValidationDetail(e[0]))
				);
			} else {
				let message = "Upload to store failed.";
				if (e.error) {
					message += ` Combined error is: ${e.error}`;
				}
				return Array(total).fill(
					new PreTranslatedDetailsValidationException({ "": [message] })
				);
			}
		} finally {
			await job.updateProgress(total);
		}
		await this.flushDocumentsCache(sentDocuments);
		void this.namedPlaceSideEffects(sentDocuments, personID);
		return [];
	}

	private async namedPlaceSideEffects(documents: Populated<Document>[], personID: string) {
		const docsWithNamedPlace = documents.filter(document => document.namedPlaceID);

		const person = await this.personsService.get(personID);

		for (const docWithNamedPlace of docsWithNamedPlace) {
			try {
				await this.documentsService.namedPlaceSideEffects(
					docWithNamedPlace as Populated<Document> & { id: string },
					person
				);
			} catch (e) {
				this.logger.error(`Named place side effect failed for ${docWithNamedPlace.id}`);
			}
		}
		await this.flushDocumentsCacheForNamedPlaceDocs(docsWithNamedPlace);
	}

	private async flushDocumentsCacheForNamedPlaceDocs(docsWithNamedPlace: Document[]) {
		const namedPlaceIDs = docsWithNamedPlace.reduce((namedPlaceIDs, d) => {
			if (d.namedPlaceID) {
				namedPlaceIDs.add(d.namedPlaceID);
			}
			return namedPlaceIDs;
		}, new Set<string>());

		for (const namedPlaceID of namedPlaceIDs.values()) {
			await this.documentsService.store.flushCache({ namedPlaceID, gatherings: [{ }] });
		}
	}

	private async flushDocumentsCache(documents: Populated<Document>[]) {
		const creators = documents.reduce((creators, d) => {
			if (d.creator) {
				creators.add(d.creator);
			}
			return creators;
		}, new Set<string>());
		const documentSample = firstFromNonEmptyArr(documents);
		const { collectionID } = documentSample; // All should have same collectionID.

		for (const creator of creators.values()) {
			await this.documentsService.store.flushCache({ collectionID, creator });
		}
	}

	getJobDocuments(
		id: string,
		personID: string
	): Promise<(Populated<Document> | PopulatedSecondaryDocumentOperation)[]>
	{
		return this.cache.lRange(getDocumentsCacheKey(id, personID), 0, -1);
	}
}

const assignExtrasMutably = (
	documents: (Populated<Document> | PopulatedSecondaryDocumentOperation)[],
	publicityRestrictions?: PublicityRestrictions,
	dataOrigin?: DataOrigin
) => {
	if (!publicityRestrictions && !dataOrigin) {
		return documents;
	}
	documents.forEach(document => {
		if (isSecondaryDocumentDelete(document)) {
			return;
		}
		if (dataOrigin) {
			document.dataOrigin = [dataOrigin];
		}
		if (publicityRestrictions) {
			document.publicityRestrictions = publicityRestrictions;
		}
	});
	return documents;
};
