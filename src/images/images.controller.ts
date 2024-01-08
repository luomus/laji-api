import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaController } from '../abstract-media/abstract-media.controller';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { GetPageDto, Media, MediaType } from '../abstract-media/abstract-media.dto';
import { Image } from './image.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';

const whitelist = [
    "captureDateTime",
    "caption",
    "capturerVerbatim",
    "keyword",
    "intellectualOwner",
    "intellectualRights",
    "fullURL",
    "largeURL",
    "squareThumbnailURL",
    "thumbnailURL",
    "originalURL",
    "uploadedBy"
];

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("images")
@ApiTags("Image")
export class ImagesController extends AbstractMediaController {
    constructor(
        abstractMediaService: AbstractMediaService,
    ) {
        super(abstractMediaService, MediaType.image);
    }

    /** Get all images */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Image))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    async getAll(dto: GetPageDto): Promise<Media[]> {
        return super.getAll(dto);
    }
}

