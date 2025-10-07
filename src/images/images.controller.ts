import { Body, Delete, Get, HttpCode, HttpStatus, Next, Param, Post, Put, Req, Res, UseInterceptors }
	from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import { AbstractMediaService } from "../abstract-media/abstract-media.service";
import { FileUploadResponse, MediaType } from "../abstract-media/abstract-media.dto";
import { Image } from "./image.dto";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { PersonToken } from "src/decorators/person-token.decorator";
import { Person } from "src/persons/person.dto";
import { Serializer } from "src/serialization/serializer.interceptor";

@LajiApiController("images")
@ApiTags("Image")
export class ImagesController {
	constructor(
		private abstractMediaService: AbstractMediaService<MediaType.image>
	) {}

	/** Upload image and get temporary id */
	@Post()
	@HttpCode(200)
	@ApiOkResponse({ type: FileUploadResponse })
	async upload(
		@PersonToken() __: Person, // Checks that the person token is valid.
		@Req() req: Request,
		@Res() res: Response,
		@Next() next: NextFunction
	) {
		void this.abstractMediaService.uploadProxy(req, res, next);
	}

	/** Get image by id */
	@Get(":id")
	@UseInterceptors(Serializer(Image))
	get(
		@Param("id") id: string,
		@PersonToken({ required: false }) person?: Person
	): Promise<Image> {
		return this.abstractMediaService.get(id, person);
	}

	/** Update image metadata */
	@Put(":id")
	@UseInterceptors(Serializer(Image))
	updateMetadata(
		@Param("id") id: string,
		@PersonToken() person: Person,
		@Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.updateMetadata(id, image, person);
	}

	/** Delete image */
	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	delete(@Param("id") id: string, @PersonToken() person: Person) {
		return this.abstractMediaService.deleteMedia(id, person);
	}

	/** Fetch large image by id */
	@Get(":id/large.jpg")
	findLarge(
		@Param("id") id: string,
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
		@PersonToken({ required: false }) person: Person | undefined,
		@Res() res: Response
	) {
		void this.abstractMediaService.getURL(id, "thumbnailURL", person).then(url => {
			res.redirect(url);
		});
	}

	/** Upload image metadata */
	@Post(":tempId")
	@UseInterceptors(Serializer(Image))
	async uploadMetadata(
		@Param("tempId") tempId: string,
		@PersonToken() person: Person,
		@Body() image: Image
	): Promise<Image> {
		return this.abstractMediaService.uploadMetadata(tempId, image, person);
	}
}
