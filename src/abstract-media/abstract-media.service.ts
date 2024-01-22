import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TriplestoreService } from "../triplestore/triplestore.service";
import { Media, MediaType, MetaUploadData, MetaUploadResponse, PartialMeta } from "./abstract-media.dto";
import * as _request from "request";
import { PersonsService } from "../persons/persons.service";
import { Person } from "../persons/person.dto";
import { RestClientService } from "../rest-client/rest-client.service";

const typeMediaClassMap: Record<MediaType, string> = {
	[MediaType.image]: "IMAGE",
	[MediaType.audio]: "AUDIO"
};

const typeMediaNameMap: Record<MediaType, string> = {
	[MediaType.image]: "images",
	[MediaType.audio]: "audio"
};

@Injectable()
export class AbstractMediaService {
	constructor(
		@Inject("MEDIA_REST_CLIENT") private mediaClient: RestClientService,
		private configService: ConfigService,
		private triplestoreService: TriplestoreService,
		private personsService: PersonsService,
	) {}

	async findMedia<T extends MediaType>(type: T, idIn?: string[]): Promise<Media<T>[]> {
		return await this.triplestoreService.find<Media<T>>(
			{
				type,
				subject: idIn?.join(","),
				predicate: "MZ.publicityRestrictions",
				objectresource: "MZ.publicityRestrictionsPublic"
			}
		);
	}

	/** @throws HttpException */
	async get<T extends MediaType>(type: T, id: string): Promise<Media<T>> {
		const [result] = await this.findMedia(type, [id]);
		if (!result) {
			throw new HttpException("Not found", 404);
		}
		return result;
	}

	/** @throws HttpException */
	async getURL<T extends MediaType>(type: T, id: string, urlKey: keyof Media<T>): Promise<string> {
		const result = await this.get(type, id);
		if (!result[urlKey]) {
			throw new HttpException("Not found", 404);
		}
		return result[urlKey] as string;
	}

	/** @throws HttpException */
	async getUploadProxy(type: MediaType, personToken: string): Promise<_request.Request> {
		// Check that the person token is valid.
		await this.personsService.getByToken(personToken);

		const basePath = this.configService.get("MEDIA_PATH") as string;
		const basicAuth = this.configService.get("MEDIA_AUTH") as string;
		const auth = this.parseBasicAuth(basicAuth);

		return _request(basePath + "/api/fileUpload", {
			auth,
			"qs": {
				"mediaClass": typeMediaClassMap[type]
			}
		});
	}

	/** @throws HttpException */
	async uploadMetadata<T extends MediaType>(
		type: T, tempId: string, media: Media<T>, personToken: string
	): Promise<Media<T>> {
		let person = await this.personsService.getByToken(personToken);
		if (personToken === this.configService.get("IMPORTER_TOKEN")) {
			person = { ...person, id: media.uploadedBy || "" };
		}

		if (!media.intellectualRights) {
			throw new HttpException("Intellectual rights is required", 422);
		}

		const metadata = this.newMetadata(media, person, tempId);
		const data = await this.mediaClient.post<MetaUploadResponse[]>(
			`api/${typeMediaNameMap[type]}`, metadata
		);

		return this.get(type, data[0].id);
	}

	/** @throws HttpException */
	async updateMetadata<T extends MediaType>(
		type: T, id: string, media: Media<T>, personToken: string
	): Promise<Media<T>> {
		const person = await this.personsService.getByToken(personToken);
		const current = await this.get(type, id);

		if (current.uploadedBy !== person.id) {
			throw new HttpException(`Can only update ${typeMediaNameMap[type]} uploaded by the user`, 400);
		}

		const metadata = this.mediaToMeta<T>(media, person, current);
		try {
			await this.mediaClient.put(`api/${typeMediaNameMap[type]}/${id}`, metadata);
		} catch (e) {
			const errorData = e.response?.data;
			if (typeof errorData === "string" && errorData.includes("TRIPLESTORE")) {
				throw new HttpException(
					"Meta data was not in correct form. Place check that all the values and properties are accepted",
					400
				);
			}
			throw e;
		}

		return this.get(type, id);
	}

	/** @throws HttpException */
	async deleteMedia<T extends MediaType>(type: T, id: string, personToken: string): Promise<void> {
		const person = await this.personsService.getByToken(personToken);
		const current = await this.get(type, id);

		if (current.uploadedBy !== person.id) {
			throw new HttpException(`Can only delete ${typeMediaNameMap[type]} uploaded by the user`, 400);
		}

		await this.mediaClient.delete(`api/${typeMediaNameMap[type]}/${id}`);
	}

	private newMetadata<T extends MediaType>(media: Media<T>, person: Person, tempId: string): MetaUploadData[] {
		const meta = this.mediaToMeta<T>(media, person);
		return [{
			meta: meta,
			tempFileId: tempId
		}];
	}

	private mediaToMeta<T extends MediaType>(
		media: Media<T>, person: Partial<Person> = {}, current: Partial<Media<T>> = {}
	): PartialMeta {
		return {
			capturers: media.capturerVerbatim || [],
			rightsOwner: media.intellectualOwner || "",
			license: media.intellectualRights,
			identifications: {
				verbatim: media.taxonVerbatim || current.taxonVerbatim,
				taxonIds: current.taxonURI
			},
			caption: media.caption,
			taxonDescriptionCaption: undefined,
			captureDateTime: this.timeToApiTime(media.captureDateTime),
			tags: media.keyword || [],
			documentId: current.documentURI?.[0],
			uploadedBy: current.uploadedBy || person.id,
			sourceSystem: current.sourceSystem,
			uploadedDateTime: current.uploadDateTime,
			sortOrder: media.sortOrder || current.sortOrder,
			secret: (
				current.publicityRestrictions && current.publicityRestrictions !== "MZ.publicityRestrictionsPublic"
			) || false
		};
	}

	private timeToApiTime(dateString?: string): string | undefined {
		if (!dateString) {
			return;
		}

		const date = new Date(dateString);

		if (isNaN(date.getTime())) {
			return;
		}

		return Math.floor(date.getTime() / 1000).toString();
	}

	private parseBasicAuth(auth: string): { user?: string, pass?: string } {
		const parts = auth.split(" ");
		if (parts[0] !== "Basic") {
			return {};
		}

		const result = atob(parts[1]).split(":");

		return { user: result[0], pass: result[1] };
	}
}
