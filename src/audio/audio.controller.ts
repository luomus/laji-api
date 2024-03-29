import {
	Body,
	Delete,
	Get, HttpCode, HttpStatus,
	Param,
	Post,
	Put,
	Query,
	Req,
	Res,
	UseInterceptors
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Audio } from "./audio.dto";
import { createQueryParamsInterceptor } from "../interceptors/query-params/query-params.interceptor";
import { Request, Response } from "express";
import { FindOneDto, GetPageDto, QueryWithPersonTokenDto } from "../common.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";

@LajiApiController("audio")
@ApiTags("Audio")
export class AudioController {
	constructor(
		private abstractMediaService: AbstractMediaService,
	) {}

	/** Get all audio */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetPageDto, Audio))
	async getAll(@Query() { idIn }: GetPageDto): Promise<Audio[]> {
		return this.abstractMediaService.findMedia(MediaType.audio, idIn);
	}

	/** Upload audio and get temporary id */
	@Post()
	@ApiOkResponse({
		type: FileUploadResponse
	})
	async upload(@Query() { personToken }: QueryWithPersonTokenDto, @Req() req: Request, @Res() res: Response) {
		const proxy = await this.abstractMediaService.getUploadProxy(MediaType.audio, personToken);
		req.pipe(proxy).pipe(res);
	}

	/** Get audio by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(FindOneDto, Audio))
	findOne(@Param("id") id: string, @Query() {}: FindOneDto): Promise<Audio> {
		return this.abstractMediaService.get(MediaType.audio, id);
	}

	/** Update audio metadata */
	@Put(":id")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Audio))
	updateMetadata(
		@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.updateMetadata(MediaType.audio, id, audio, personToken);
	}

	/** Delete audio */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.abstractMediaService.deleteMedia(MediaType.audio, id, personToken);
	}

	/** Fetch mp3 by id */
	@Get(":id/mp3")
	getMp3(@Param("id") id: string, @Res() res: Response) {
		void this.abstractMediaService.getURL(MediaType.audio, id, "mp3URL").then(url => {
			res.redirect(url);
		});
	}

	/** Fetch thumbnail by id */
	@Get(":id/thumbnail.jpg")
	getThumbnail(@Param("id") id: string, @Res() res: Response) {
		void this.abstractMediaService.getURL(MediaType.audio, id, "thumbnailURL").then(url => {
			res.redirect(url);
		});
	}

	/** Fetch wav by id */
	@Get(":id/wav")
	getWav(@Param("id") id: string, @Res() res: Response) {
		void this.abstractMediaService.getURL(MediaType.audio, id, "wavURL").then(url => {
			res.redirect(url);
		});
	}

	/** Upload audio metadata */
	@Post(":tempId")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Audio))
	async uploadMetadata(
		@Param("tempId") tempId: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.uploadMetadata(MediaType.audio, tempId, audio, personToken);
	}
}
