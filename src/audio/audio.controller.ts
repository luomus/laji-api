import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaController } from '../abstract-media/abstract-media.controller';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { GetPageDto, Media, MediaType } from '../abstract-media/abstract-media.dto';
import { Audio } from './audio.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';
import { Image } from '../images/image.dto';

const whitelist = [
    "captureDateTime",
    "caption",
    "capturerVerbatim",
    "keyword",
    "intellectualOwner",
    "intellectualRights",
    "fullURL",
    "mp3URL",
    "wavURL",
    "thumbnailURL",
    "uploadedBy"
];

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("audio")
@ApiTags("Audio")
export class AudioController extends AbstractMediaController {
    constructor(
        abstractMediaService: AbstractMediaService,
    ) {
        super(abstractMediaService, MediaType.audio);
    }

    /** Get all audio */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Audio))
    @SwaggerRemoteRef({ source: "store", ref: "audio" })
    async getAll(dto: GetPageDto): Promise<Media[]> {
        return super.getAll(dto);
    }
}
