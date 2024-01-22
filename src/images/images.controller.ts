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
import { Request, Response } from "express";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Image } from "./image.dto";
import { createQueryParamsInterceptor } from "../interceptors/query-params/query-params.interceptor";
import { FindOneDto, GetPageDto, QueryWithPersonTokenDto } from "../common.dto";
import { LajiApiController } from "src/decorators/laji-api-controller";

@LajiApiController("images")
@ApiTags("Image")
export class ImagesController {
	constructor(
		private abstractMediaService: AbstractMediaService
	) {}

	/** Get all images */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetPageDto, Image))
	async getAll(@Query() { idIn }: GetPageDto): Promise<Image[]> {
		return this.abstractMediaService.findMedia(MediaType.image, idIn);
	}

	/** Upload image and get temporary id */
	@Post()
	@ApiOkResponse({ type: FileUploadResponse })
	async upload(@Query() { personToken }: QueryWithPersonTokenDto, @Req() req: Request, @Res() res: Response) {
		const proxy = await this.abstractMediaService.getUploadProxy(MediaType.image, personToken);
		req.pipe(proxy).pipe(res);
	}

	/** Get image by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(FindOneDto, Image))
	findOne(@Param("id") id: string, @Query() {}: FindOneDto): Promise<Image> {
		return this.abstractMediaService.get(MediaType.image, id);
	}

	/** Update image metadata */
	@Put(":id")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Image))
	updateMetadata(
		@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.updateMetadata(MediaType.image, id, image, personToken);
	}

	/** Delete image */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto) {
		return this.abstractMediaService.deleteMedia(MediaType.image, id, personToken);
	}

	/** Fetch large image by id */
	@Get(":id/large.jpg")
	findLarge(@Param("id") id: string, @Res() res: Response) {
		this.abstractMediaService.getURL(MediaType.image, id, "largeURL").then(url => {
			res.redirect(url);
		});
	}

	/** Fetch square thumbnail by id */
	@Get(":id/square.jpg")
	findSquare(@Param("id") id: string, @Res() res: Response) {
		this.abstractMediaService.getURL(MediaType.image, id, "squareThumbnailURL").then(url => {
			res.redirect(url);
		});
	}

	/** Fetch thumbnail by id */
	@Get(":id/thumbnail.jpg")
	findThumbnail(@Param("id") id: string, @Res() res: Response) {
		this.abstractMediaService.getURL(MediaType.image, id, "thumbnailURL").then(url => {
			res.redirect(url);
		});
	}

	/** Upload image metadata */
	@Post(":tempId")
	@UseInterceptors(createQueryParamsInterceptor(undefined, Image))
	async uploadMetadata(
		@Param("tempId") tempId: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.uploadMetadata(MediaType.image, tempId, image, personToken);
	}
}

