import { Body, Delete, Get, HttpCode, HttpStatus, Next, Param, Post, Put, Query, Req, Res, UseInterceptors }
	from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Audio } from "./audio.dto";
import { NextFunction, Request, Response } from "express";
import { QueryWithMaybePersonTokenDto, QueryWithPersonTokenDto } from "../common.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PersonToken } from "src/decorators/person-token.decorator";
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
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() __: Person, // Checks that the person token is valid.
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
		@Query() {}: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person?: Person
	): Promise<Audio> {
		return this.abstractMediaService.get(id, person);
	}

	/** Update audio metadata */
	@Put(":id")
	@UseInterceptors(Serializer(Audio))
	updateMetadata(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person,
		@Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.updateMetadata(id, audio, person);
	}

	/** Delete audio */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @Query() _: QueryWithPersonTokenDto, @PersonToken() person: Person) {
		return this.abstractMediaService.deleteMedia(id, person);
	}

	/** Fetch mp3 by id */
	@Get(":id/mp3")
	getMp3(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "mp3URL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Fetch thumbnail by id */
	@Get(":id/thumbnail.jpg")
	getThumbnail(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "thumbnailURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Fetch wav by id */
	@Get(":id/wav")
	getWav(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "wavURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Fetch flac by id */
	@Get(":id/flac")
	findFlac(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "flacURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Upload audio metadata */
	@Post(":tempId")
	@UseInterceptors(Serializer(Audio))
	async uploadMetadata(
		@Param("tempId") tempId: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person,
		@Body() audio: Audio
	): Promise<Audio> {
		return this.abstractMediaService.uploadMetadata(tempId, audio, person);
	}
}
