import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TriplestoreService } from "../triplestore/triplestore.service";
import { Media, MediaType, MetaUploadData, MetaUploadResponse, PartialMeta } from "./abstract-media.dto";
import { Person } from "../persons/person.dto";
import { RestClientService } from "../rest-client/rest-client.service";
import { MEDIA_CLIENT, MEDIA_CONFIG } from "src/provider-tokens";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

export type AbstractMediaServiceConfig = {
	mediaClass: "IMAGE" | "AUDIO";
	apiPath: "images" | "audio";
	type: MediaType;
}

@Injectable()
export class AbstractMediaService<T extends MediaType> {
	constructor(
		@Inject(MEDIA_CLIENT) private mediaClient: RestClientService,
		@Inject(MEDIA_CONFIG) private abstracted: AbstractMediaServiceConfig,
		private config: ConfigService,
		private triplestoreService: TriplestoreService,
	) {}

	private logger = new Logger(AbstractMediaService.name);

	uploadProxy = createProxyMiddleware({
		target: this.config.get("MEDIA_HOST"),
		changeOrigin: true,
		pathRewrite: {
			[`^/${this.abstracted.apiPath}`]: "/api/fileUpload/"
		},
		on: {
			proxyReq: (proxyReq, req) => {
				const baseUrl = `${proxyReq.protocol}//${proxyReq.host}`;
				const url = new URL(proxyReq.path, baseUrl);
				url.searchParams.append("mediaClass", this.abstracted.mediaClass);
				proxyReq.path = url.pathname + url.search;
				return fixRequestBody(proxyReq, req);
			}
		},
		headers: {
			authorization: this.config.get("MEDIA_AUTH") as string
		},
		logger: {
			info: this.logger.verbose,
			warn: this.logger.warn,
			error: this.logger.error
		}
	});

	async findMedia(idIn?: string[]): Promise<Media<T>[]> {
		return await this.triplestoreService.find<Media<T>>(
			{
				type: this.abstracted.type,
				subject: idIn?.join(","),
				predicate: "MZ.publicityRestrictions",
				objectresource: "MZ.publicityRestrictionsPublic"
			}
		);
	}

	async get(id: string): Promise<Media<T>> {
		const [result] = await this.findMedia([id]);
		if (!result) {
			throw new HttpException("Not found", 404);
		}
		return result;
	}

	async getURL(id: string, urlKey: keyof Media<T>): Promise<string> {
		const result = await this.get(id);
		if (!result[urlKey]) {
			throw new HttpException("Not found", 404);
		}
		return result[urlKey] as string;
	}

	async uploadMetadata(tempId: string, media: Media<T>, person: Person): Promise<Media<T>> {
		if (!media.intellectualRights) {
			throw new HttpException("Intellectual rights is required", 422);
		}

		const metadata = this.newMetadata(media, person, tempId);
		const data = await this.mediaClient.post<MetaUploadResponse[]>(
			`api/${this.abstracted.apiPath}`, metadata
		);

		return this.get(data[0]!.id);
	}

	async updateMetadata(id: string, media: Media<T>, person: Person): Promise<Media<T>> {
		const current = await this.get(id);

		if (current.uploadedBy !== person.id) {
			throw new HttpException("Can only update media uploaded by the user", 400);
		}

		const metadata = this.mediaToMeta(media, person, current);
		try {
			await this.mediaClient.put(`api/${this.abstracted.apiPath}/${id}`, metadata);
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

		return this.get(id);
	}

	async deleteMedia(id: string, person: Person): Promise<void> {
		const current = await this.get(id);

		if (current.uploadedBy !== person.id) {
			throw new HttpException("Can only delete media uploaded by the user", 400);
		}

		await this.mediaClient.delete(`api/${this.abstracted.apiPath}/${id}`);
	}

	private newMetadata(media: Media<T>, person: Person, tempId: string): MetaUploadData[] {
		const meta = this.mediaToMeta(media, person);
		return [{
			meta: meta,
			tempFileId: tempId
		}];
	}

	private mediaToMeta(media: Media<T>, person: Person, current: Partial<Media<T>> = {}): PartialMeta {
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
}
