import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FindOneDto, GetPageDto, MediaType } from '../abstract-media/abstract-media.dto';
import { Image } from './image.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("images")
@ApiTags("Image")
export class ImagesController {
    constructor(
        private abstractMediaService: AbstractMediaService,
    ) {}

    /** Get all images */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Image))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    async getAll(@Query() { idIn }: GetPageDto) {
        return this.abstractMediaService.getMedia(MediaType.image, idIn);
    }

    /** Get image by id */
    @Get(":id")
    @UseInterceptors(createQueryParamsInterceptor(FindOneDto, Image))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
        return this.abstractMediaService.fineOne(MediaType.image, id);
    }
}

