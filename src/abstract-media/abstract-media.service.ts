import { HttpException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TriplestoreService } from "../triplestore/triplestore.service";
import { Media, MediaType, MetaUploadData, MetaUploadResponse, PartialMeta } from "./abstract-media.dto";
import * as _request from "request";
import { PersonsService } from "../persons/persons.service";
import { Person } from "../persons/person.dto";
import { RestClientService } from "../rest-client/rest-client.service";
import { MEDIA_CLIENT } from "src/provider-tokens";

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
		@Inject(MEDIA_CLIENT) private mediaClient: RestClientService,
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

	async get<T extends MediaType>(type: T, id: string): Promise<Media<T>> {
		const [result] = await this.findMedia(type, [id]);
		if (!result) {
			throw new HttpException("Not found", 404);
		}
		return result;
	}

	async getURL<T extends MediaType>(type: T, id: string, urlKey: keyof Media<T>): Promise<string> {
		const result = await this.get(type, id);
		if (!result[urlKey]) {
			throw new HttpException("Not found", 404);
		}
		return result[urlKey] as string;
	}

	async getUploadProxy(type: MediaType, personToken: string): Promise<_request.Request> {
		// Check that the person token is valid.
		await this.personsService.getByToken(personToken);

		const basePath = this.configService.get("MEDIA_HOST") as string;
		const basicAuth = this.configService.get("MEDIA_AUTH") as string;
		const auth = this.parseBasicAuth(basicAuth);

		return _request(basePath + "/api/fileUpload", {
			auth,
			"qs": {
				"mediaClass": typeMediaClassMap[type]
			}
		});
	}

	async uploadMetadata<T extends MediaType>(
		type: T, tempId: string, media: Media<T>, personToken: string
	): Promise<Media<T>> {
		if (!media.intellectualRights) {
			throw new HttpException("Intellectual rights is required", 422);
		}

		const person = await this.personsService.getByToken(personToken);

		const metadata = this.newMetadata(media, person, tempId);
		const data = await this.mediaClient.post<MetaUploadResponse[]>(
			`api/${typeMediaNameMap[type]}`, metadata
		);

		return this.get(type, data[0]!.id);
	}

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
		media: Media<T>, person: Person, current: Partial<Media<T>> = {}
	): PartialMeta {
		const uploadedBy = current.uploadedBy
			|| person.isImporter()
			? media.uploadedBy
			: person.id;
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
			uploadedBy,
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
		const base64EncodedAuth = parts[1];
		if (!base64EncodedAuth) {
			throw new Error("Badly configured auth");
		}
		const [user, pass] = atob(base64EncodedAuth).split(":");
		return { user, pass };
	}
}
