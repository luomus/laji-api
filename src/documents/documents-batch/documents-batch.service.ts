import { HttpException, Injectable } from "@nestjs/common";
import { Document } from "@luomus/laji-schema";
import {
	BatchJobValidationStatusResponse, isSecondaryDocumentDelete, PublicityRestrictions,
	DataOrigin, BatchJobPhase, BatchJobStep, JobPayload, JobResult,
	SecondaryDocumentOperation
} from "../documents.dto";
import { CACHE_1_D, LocalizedException, uuid } from "src/utils";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { Person } from "src/persons/person.dto";
import { serialize } from "src/serialization/serialization.utils";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { localizeException } from "src/filters/localize-exception.filter";
import { Lang } from "src/common.dto";
import { InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { getValidSystemID } from "src/documents/documents.service";

const ONE_HOUR_S = 3600;

const nonNumericUUID = () => {
	let id = uuid(6);
	while (!isNaN(+id)) {
		id = uuid(6);
	}
	return id;
};

@Injectable()
export class DocumentsBatchService {

	constructor(
		private cache: RedisCacheService,
		@InjectQueue("documents-validation") private validationQueue: Queue<JobPayload, JobResult>,
		@InjectQueue("documents-send") private sendQueue: Queue<JobPayload, JobResult>
	) {}

	/** Creates a job that validates the given documents. After validation the job can be completed. */
	async start(
		documents: (Document | SecondaryDocumentOperation)[],
		person: Person,
		apiUser: ApiUserEntity,
		lang: Lang
	): Promise<BatchJobValidationStatusResponse> {
		if (!documents.length) {
			throw new HttpException("Send at least one document", 422);
		}

		const systemID = getValidSystemID(apiUser);

		const formIDs = new Set();
		documents.some(d => {
			formIDs.add(d.formID);
			if (formIDs.size > 1) {
				throw new LocalizedException("DOCUMENT_VALIDATION_BATCH_SAME_FORM_ID", 422);
			}
		});

		const job = await this.validationQueue.add("validate", {
			total: documents.length,
			personID: person.id,
			systemID,
			lang,
			step: BatchJobStep.validate
		}, { jobId: nonNumericUUID(), lifo: true, removeOnComplete: { age: ONE_HOUR_S * 24 }, removeOnFail: true });
		await this.storeJobDocuments(job.id!, person, documents);

		return exposeJobStatus(job as any, lang);
	}

	/** Creates the documents of a given job if it's processed and valid, sending them to store or warehouse. */
	async complete(
		jobID: string,
		person: Person,
		lang: Lang,
		publicityRestrictions?: PublicityRestrictions,
		dataOrigin?: DataOrigin
	): Promise<BatchJobValidationStatusResponse> {
		const job = await this.validationQueue.getJob(jobID);

		if (!job) {
			throw new HttpException("No job found", 404);
		}

		const jobStatus = await exposeJobStatus(job, lang);

		if (jobStatus.phase === BatchJobPhase.completing) {
			throw new HttpException("The job is still processing the sending", 422);
		} else if (jobStatus.phase === BatchJobPhase.completed) {
			throw new HttpException("The job is already completed", 422);
		}

		if (jobStatus.errors.some(e => e !== null)) {
			throw new HttpException("The job has validation errors. Fix the documents and create a new job", 422);
		}

		if (publicityRestrictions || dataOrigin) {
			const documents = await this.getJobDocuments(jobID, person);
			if (!documents) {
				throw new HttpException("The job is in invalid state. Start again.", 422);
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
			await this.storeJobDocuments(jobID, person, documents);
		}

		await this.validationQueue.remove(job.id!);
		const ONE_HOUR_S = 3600;
		const newJob = await this.sendQueue.add(
			"send",
			{ ...job.data, step: BatchJobStep.send },
			{ jobId: job.id, lifo: true, removeOnComplete: { age: ONE_HOUR_S }, removeOnFail: { age: ONE_HOUR_S } }
		);

		return exposeJobStatus(newJob as any, lang);
	}

	async getStatus(
		jobID: string,
		person: Person,
		lang: Lang
	): Promise<BatchJobValidationStatusResponse> {
		const job = await this.getJob(jobID, person);
		if (!job) {
			throw new HttpException("Job not found", 404);
		}
		return exposeJobStatus(job, lang);
	}

	async getJob(id: string, person: Person): Promise<Job | undefined> {
		let job: Job<JobPayload, JobResult> | undefined;

		for (const queue of [this.sendQueue, this.validationQueue]) {
			job = await queue.getJob(id);
			if (!job) {
				continue;
			}
			if (job!.data.personID !== person.id) {
				throw new HttpException("This job wasn't started by you", 403);
			}
			return job;
		}
	}

	async storeJobDocuments(id: string, person: Person, documents: (Document | SecondaryDocumentOperation)[]) {
		return this.cache.set(getDocumentsCacheKey(id, person.id), documents, CACHE_1_D);
	}

	async getJobDocuments(id: string, person: Person) {
		return this.cache.get<(Document | SecondaryDocumentOperation)[]>(
			getDocumentsCacheKey(id, person.id)
		);
	}
}

export const getDocumentsCacheKey = (jobID: string, personID: string) => ["BATCH_DOCUMENTS", personID, jobID].join(":");

const exposeJobStatus = async (
	job: Job<JobPayload, JobResult>,
	lang: Lang,
): Promise<BatchJobValidationStatusResponse> => {
	const { data: { step, total } } = job;

	// Apparently there's some race condition in bullmq that makes it possible for isCompleted() to return true but it's
	// still missing return value, so we have do double check.
	const isCompleted = !!job.returnvalue && await job.isCompleted();

	const exposedJob = serialize({
		id: job.id!,
		step,
		status: { processed: job.progress, total },
		isCompleted
	}, BatchJobValidationStatusResponse);
	if (isCompleted) {
		exposedJob.errors = job.returnvalue.map(e => e === null
			? e
			: (lang ? localizeException(e, lang) as any : e).details
		);
	}
	return exposedJob;
};
