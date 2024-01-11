import {
    Body,
    Controller,
    Delete,
    Get, HttpCode, HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Req,
    Res,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SwaggerRemote, SwaggerRemoteRef } from '../swagger/swagger-remote.decorator';
import { AbstractMediaService } from '../abstract-media/abstract-media.service';
import { FileUploadResponse, MediaType } from '../abstract-media/abstract-media.dto';
import { Image } from './image.dto';
import { createQueryParamsInterceptor } from '../interceptors/query-params/query-params.interceptor';
import { ValidPersonTokenGuard } from '../guards/valid-person-token.guard';
import { FindOneDto, GetPageDto, QueryWithPersonTokenDto } from '../common.dto';

const whitelist = [
    "id",
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
export class ImagesController {
    constructor(
        private abstractMediaService: AbstractMediaService
    ) {}

    /** Get all images */
    @Get()
    @UseInterceptors(createQueryParamsInterceptor(GetPageDto, Image, { whitelist }))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    async getAll(@Query() { idIn }: GetPageDto) {
        return this.abstractMediaService.getMedia(MediaType.image, idIn);
    }

    /** Upload image and get temporary id */
    @Post()
    @UseGuards(ValidPersonTokenGuard)
    @ApiOkResponse({
        type: FileUploadResponse
    })
    async upload(@Query() {}: QueryWithPersonTokenDto, @Req() req: Request, @Res() res: Response) {
        const proxy = this.abstractMediaService.getUploadProxy(MediaType.image);
        req.pipe(proxy).pipe(res);
    }

    /** Get image by id */
    @Get(":id")
    @UseInterceptors(createQueryParamsInterceptor(FindOneDto, Image, { whitelist }))
    @SwaggerRemoteRef({ source: "store", ref: "image" })
    findOne(@Param("id") id: string, @Query() {}: FindOneDto) {
        return this.abstractMediaService.findOne(MediaType.image, id);
    }

    /** Update image metadata */
    @Put(":id")
    @UseInterceptors(createQueryParamsInterceptor(undefined, Image, { whitelist }))
    @UseGuards(ValidPersonTokenGuard)
    updateMetadata(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image) {
        return this.abstractMediaService.updateMetadata(MediaType.image, id, image, personToken);
    }

    /** Delete image */
    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(ValidPersonTokenGuard)
    delete(@Param("id") id: string, @Query() { personToken }: QueryWithPersonTokenDto) {
        return this.abstractMediaService.deleteMedia(MediaType.image, id, personToken);
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
    @UseInterceptors(createQueryParamsInterceptor(undefined, Image, { whitelist }))
    @UseGuards(ValidPersonTokenGuard)
    async uploadMetadata(@Param("tempId") tempId: string, @Query() { personToken }: QueryWithPersonTokenDto, @Body() image: Image) {
        return this.abstractMediaService.uploadMetadata(MediaType.image, tempId, image, personToken);
    }
}

