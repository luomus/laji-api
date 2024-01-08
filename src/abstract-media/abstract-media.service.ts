import { HttpException, Injectable } from '@nestjs/common';
import { TriplestoreService } from '../triplestore/triplestore.service';
import { Media, MediaType } from './abstract-media.dto';

@Injectable()
export class AbstractMediaService {
    constructor(
        private triplestoreService: TriplestoreService
    ) {}

    async getMedia<T extends MediaType>(type: T, ids?: string): Promise<Media<T>[]> {
        return await this.triplestoreService.find<Media<T>>(
            { type, subject: ids, predicate: 'MZ.publicityRestrictions', objectresource: 'MZ.publicityRestrictionsPublic' }
        );
    }

    async fineOne<T extends MediaType>(type: T, id: string): Promise<Media<T>> {
        const result = await this.getMedia(type, id);
        if (result?.length > 0) {
            return result.pop() as Media<T>;
        } else {
            throw new HttpException("Not found", 404);
        }
    }
}
