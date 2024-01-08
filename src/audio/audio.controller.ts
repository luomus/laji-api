import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FindOneDto, GetPageDto, MediaType } from '../abstract-media/abstract-media.dto';
import { Audio } from './audio.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("audio")
@ApiTags("Audio")
export class AudioController {
    constructor(
        private abstractMediaService: AbstractMediaService,
    ) {}

    /** Get all audio */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Audio))
    @SwaggerRemoteRef({ source: "store", ref: "audio" })
    async getAll(@Query() { idIn }: GetPageDto) {
        return this.abstractMediaService.getMedia(MediaType.audio, idIn);
    }

    /** Get audio by id */
    @Get(":id")
    @UseInterceptors(createQueryParamsInterceptor(FindOneDto, Audio))
    @SwaggerRemoteRef({ source: "store", ref: "audio" })
    findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
        return this.abstractMediaService.fineOne(MediaType.audio, id);
    }
}
