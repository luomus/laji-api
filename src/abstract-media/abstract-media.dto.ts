import { IntersectionType } from '@nestjs/swagger';
import { Lang, LangQueryDto, PagedDto } from '../common.dto';
import { Image, Audio } from '@luomus/laji-schema';
import { ParseOptionalBoolean } from '../serializing/serializing';
import { IsBoolean } from 'class-validator';

export class GetPageDto extends IntersectionType(PagedDto, LangQueryDto) {
    /**
     * Comma separated ids
     */
    idIn?: string;
}

export class FindOneDto  {
    lang?: Lang = Lang.en;
    @ParseOptionalBoolean()
    @IsBoolean()
    langFallback?: boolean = true;
}

export enum MediaType {
    image = 'MM.image',
    audio = 'MM.audio'
}

export type Media<T extends MediaType> = T extends MediaType.image ? Image : Audio;
