import { Controller, Get, Param, Query, Res, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FindOneDto, GetPageDto, MediaType } from '../abstract-media/abstract-media.dto';
import { Audio } from './audio.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';
import { Response } from 'express';

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
        return this.abstractMediaService.findOne(MediaType.audio, id);
    }

    /** Fetch mp3 by id */
    @Get(":id/mp3")
    findMp3(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.audio, id, 'mp3URL').then(url => {
            res.redirect(url);
        });
    }

    /** Fetch thumbnail by id */
    @Get(":id/thumbnail.jpg")
    findThumbnail(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.audio, id, 'thumbnailURL').then(url => {
            res.redirect(url);
        });
    }

    /** Fetch wav by id */
    @Get(":id/wav")
    findWav(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.audio, id, 'wavURL').then(url => {
            res.redirect(url);
        });
    }
}
