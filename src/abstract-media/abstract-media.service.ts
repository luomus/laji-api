import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TriplestoreService } from '../triplestore/triplestore.service';
import { Media, MediaType } from './abstract-media.dto';
import * as _request from 'request';

@Injectable()
export class AbstractMediaService {
    constructor(
        private configService: ConfigService,
        private triplestoreService: TriplestoreService
    ) {}

    async getMedia<T extends MediaType>(type: T, ids?: string): Promise<Media<T>[]> {
        return await this.triplestoreService.find<Media<T>>(
            { type, subject: ids, predicate: 'MZ.publicityRestrictions', objectresource: 'MZ.publicityRestrictionsPublic' }
        );
    }

    async findOne<T extends MediaType>(type: T, id: string): Promise<Media<T>> {
        const result = await this.getMedia(type, id);
        if (result?.length > 0) {
            return result.pop() as Media<T>;
        } else {
            throw new HttpException("Not found", 404);
        }
    }

    async findURL<T extends MediaType>(type: T, id: string, urlKey: keyof Media<T>): Promise<string> {
        const result = await this.findOne(type, id);
        if (result[urlKey]) {
            return result[urlKey] as string;
        } else {
            throw new HttpException("Not found", 404);
        }
    }

    getUploadProxy(type: MediaType) {
        const basePath = this.configService.get("MEDIA_PATH") as string;
        const user = this.configService.get("MEDIA_USER") as string;
        const pass = this.configService.get("MEDIA_PASS") as string;

        const typeMediaClassMap: Record<MediaType, string> = {
          [MediaType.image]: 'IMAGE',
          [MediaType.audio]: 'AUDIO'
        };

        return _request(basePath + '/api/fileUpload', {
            "auth": { user, pass },
            "qs": {
                "mediaClass": typeMediaClassMap[type]
            }
        });
    }
}
