import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FindOneDto, GetPageDto, MediaType } from '../abstract-media/abstract-media.dto';
import { Image } from './image.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';
import { ValidPersonTokenGuard } from '../guards/valid-person-token.guard';
import { QueryWithPersonTokenDto } from '../common.dto';

@SwaggerRemote()
@ApiSecurity("access_token")
@Controller("images")
@ApiTags("Image")
export class ImagesController {
    constructor(
        private abstractMediaService: AbstractMediaService
    ) {}

    /** Get all images */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Image))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    async getAll(@Query() { idIn }: GetPageDto) {
        return this.abstractMediaService.getMedia(MediaType.image, idIn);
    }

    /** Upload image and get temporary id */
    @Post()
    @UseGuards(ValidPersonTokenGuard)
    async upload(@Query() {}: QueryWithPersonTokenDto, @Req() req: Request, @Res() res: Response) {
        const proxy = this.abstractMediaService.getUploadProxy(MediaType.image);
        req.pipe(proxy).pipe(res);
    }

    /** Get image by id */
    @Get(":id")
    @UseInterceptors(createQueryParamsInterceptor(FindOneDto, Image))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
        return this.abstractMediaService.findOne(MediaType.image, id);
    }

    /** Update image metadata */
    @Put(":id")
    @UseGuards(ValidPersonTokenGuard)
    updateMetadata(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image) {
        return this.abstractMediaService.updateMetadata(MediaType.image, id, image, personToken);
    }

    /** Fetch large image by id */
    @Get(":id/large.jpg")
    findLarge(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.image, id, 'largeURL').then(url => {
            res.redirect(url);
        });
    }

    /** Fetch square thumbnail by id */
    @Get(":id/square.jpg")
    findSquare(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.image, id, 'squareThumbnailURL').then(url => {
            res.redirect(url);
        });
    }

    /** Fetch thumbnail by id */
    @Get(":id/thumbnail.jpg")
    findThumbnail(@Param("id") id: string, @Res() res: Response) {
        this.abstractMediaService.findURL(MediaType.image, id, 'thumbnailURL').then(url => {
            res.redirect(url);
        });
    }

    /** Upload image metadata */
    @Post(":tempId")
    @UseGuards(ValidPersonTokenGuard)
    async uploadMetadata(@Param("tempId") tempId: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image) {
        return this.abstractMediaService.uploadMetadata(MediaType.image, tempId, image, personToken);
    }
}

