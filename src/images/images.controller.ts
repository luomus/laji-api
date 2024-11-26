import { Body, Delete, Get, HttpCode, HttpStatus, Next, Param, Post, Put, Query, Req, Res, UseInterceptors }
	from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Image } from "./image.dto";
import { createQueryParamsInterceptor } from "../interceptors/query-params/query-params.interceptor";
import { QueryWithLangAndMaybePersonTokenDto, QueryWithMaybePersonTokenDto, QueryWithPersonTokenDto }
	from "../common.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";

@LajiApiController("images")
@ApiTags("Image")
export class ImagesController {
	constructor(
		private abstractMediaService: AbstractMediaService<MediaType.image>
	) {}

	/** Upload image and get temporary id */
	@Post()
	@ApiOkResponse({ type: FileUploadResponse })
	async upload(
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() __: Person, // Checks that the person token is valid.
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		void this.abstractMediaService.uploadProxy(req, res, next);
	}

	/** Get image by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(QueryWithLangAndMaybePersonTokenDto, Image))
	get(
		@Param("id") id: string,
		@Query() {}: QueryWithLangAndMaybePersonTokenDto,
		@PersonToken({ required: false }) person?: Person
	): Promise<Image> {
		return this.abstractMediaService.get(id, person);
	}

	/** Update image metadata */
	@Put(":id")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Image))
	updateMetadata(
		@Param("id") id: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person,
		@Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.updateMetadata(id, image, person);
	}

	/** Delete image */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @Query() _: QueryWithPersonTokenDto, @PersonToken() person: Person) {
		return this.abstractMediaService.deleteMedia(id, person);
	}

	/** Fetch large image by id */
	@Get(":id/large.jpg")
	findLarge(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "largeURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Fetch square thumbnail by id */
	@Get(":id/square.jpg")
	findSquare(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "squareThumbnailURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Fetch thumbnail by id */
	@Get(":id/thumbnail.jpg")
	findThumbnail(
		@Param("id") id: string,
		@Query() _: QueryWithMaybePersonTokenDto,
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "thumbnailURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Upload image metadata */
	@Post(":tempId")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Image))
	async uploadMetadata(
		@Param("tempId") tempId: string,
		@Query() _: QueryWithPersonTokenDto,
		@PersonToken() person: Person,
		@Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.uploadMetadata(tempId, image, person);
	}
}
