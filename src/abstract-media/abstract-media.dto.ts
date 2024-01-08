import { IntersectionType } from '@nestjs/swagger';
import { LangQueryDto, PagedDto } from '../common.dto';
import { Image, Audio } from '@luomus/laji-schema';

export class GetPageDto extends IntersectionType(PagedDto, LangQueryDto) {
    /**
     * Comma separated ids
     */
    idIn?: string;
}

export enum MediaType {
    image = 'MM.image',
    audio = 'MM.audio'
}

export type Media = Image | Audio;
