import { Query } from '@nestjs/common';
import { GetPageDto, MediaType } from './abstract-media.dto';
import { AbstractMediaService } from './abstract-media.service';

export class AbstractMediaController {
    constructor(
        protected abstractMediaService: AbstractMediaService,
        private type: MediaType
    ) {}

    async getAll(@Query() { idIn }: GetPageDto) {
        return this.abstractMediaService.getMedia(this.type, idIn);
    }
}
