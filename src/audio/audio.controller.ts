import { Body, Delete, Get, HttpCode, HttpStatus, Next, Param, Post, Put, Req, Res, UseInterceptors }
	from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Audio } from "./audio.dto";
import { NextFunction, Request, Response } from "express";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { RequestPerson }from "src/decorators/request-person.decorator";
import { Person } from "src/persons/person.dto";
import { Translator } from "src/interceptors/translator.interceptor";
import { Serializer } from "src/serialization/serializer.interceptor";

@LajiApiController("audio")
@ApiTags("Audio")
export class AudioController {
	constructor(
		private abstractMediaService: AbstractMediaService<MediaType.audio>,
	) {}

	/** Upload audio and get temporary id */
	@Post()
	@HttpCode(200)
	@ApiOkResponse({
		type: FileUploadResponse
	})
	async upload(
		@RequestPerson() _: Person, // Checks that the person token is valid.
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		void this.abstractMediaService.uploadProxy(req, res, next);
	}

	/** Get audio by id */
	@Get(":id")
	@UseInterceptors(Translator, Serializer(Audio))
	get(
		@Param("id") id: string,
		@RequestPerson({ required: false }) person?: Person
	): Promise<Audio> {
		return this.abstractMediaService.get(id, person);
	}

	/** Update audio metadata */
	@Put(":id")
	@UseInterceptors(Serializer(Audio))
	updateMetadata(
		@Param("id") id: string,
		@RequestPerson() person: Person,
		@Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.updateMetadata(id, audio, person);
	}

	/** Delete audio */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @RequestPerson() person: Person) {
		return this.abstractMediaService.deleteMedia(id, person);
	}

	/** Fetch mp3 by id */
	@Get(":id/mp3")
	async getMp3(
		@Param("id") id: string,
		@RequestPerson({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		const url = await this.abstractMediaService.getURL(id, "mp3URL", person);
		res.redirect(url);
	}

	/** Fetch thumbnail by id */
	@Get(":id/thumbnail.jpg")
	async getThumbnail(
		@Param("id") id: string,
		@RequestPerson({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		const url = await this.abstractMediaService.getURL(id, "thumbnailURL", person);
		res.redirect(url);
	}

	/** Fetch wav by id */
	@Get(":id/wav")
	async getWav(
		@Param("id") id: string,
		@RequestPerson({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		const url = await this.abstractMediaService.getURL(id, "wavURL", person);
		res.redirect(url);
	}

	/** Fetch flac by id */
	@Get(":id/flac")
	async findFlac(
		@Param("id") id: string,
		@RequestPerson({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		const url = await this.abstractMediaService.getURL(id, "flacURL", person);
		res.redirect(url);
	}

	/** Upload audio metadata */
	@Post(":tempId")
	@UseInterceptors(Serializer(Audio))
	async uploadMetadata(
		@Param("tempId") tempId: string,
		@RequestPerson() person: Person,
		@Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.uploadMetadata(tempId, audio, person);
	}
}
