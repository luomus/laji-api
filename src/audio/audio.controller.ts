import { Controller, Get, Param, Post, Query, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FindOneDto, GetPageDto, MediaType } from '../abstract-media/abstract-media.dto';
import { Audio } from './audio.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';
import { Request, Response } from 'express';
import { ValidPersonTokenGuard } from '../guards/valid-person-token.guard';
import { QueryWithPersonTokenDto } from '../common.dto';

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

    /** Upload audio and get temporary id */
    @Post()
    @UseGuards(ValidPersonTokenGuard)
    async upload(@Query() {}: QueryWithPersonTokenDto, @Req() req: Request, @Res() res: Response) {
        const proxy = this.abstractMediaService.getUploadProxy(MediaType.audio);
        req.pipe(proxy).pipe(res);
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
