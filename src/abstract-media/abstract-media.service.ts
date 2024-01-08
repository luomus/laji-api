import { Injectable } from '@nestjs/common';
import { TriplestoreService } from '../triplestore/triplestore.service';
import { Media, MediaType } from './abstract-media.dto';

@Injectable()
export class AbstractMediaService {
    constructor(
        private triplestoreService: TriplestoreService
    ) {}

    async getMedia(type: MediaType, ids?: string) {
        return await this.triplestoreService.find<Media>(
            { type, subject: ids, predicate: 'MZ.publicityRestrictions', objectresource: 'MZ.publicityRestrictionsPublic' }
        );
    }
}
