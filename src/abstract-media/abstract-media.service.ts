import { HttpException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TriplestoreService } from '../triplestore/triplestore.service';
import { Media, MediaType, Meta, MetaResponse, PartialMeta } from './abstract-media.dto';
import * as _request from 'request';
import * as moment from 'moment';
import { PersonsService } from '../persons/persons.service';
import { Person } from '../persons/person.dto';
import { RestClientService } from '../rest-client/rest-client.service';

const typeMediaClassMap: Record<MediaType, string> = {
    [MediaType.image]: 'IMAGE',
    [MediaType.audio]: 'AUDIO'
};

const typePathMap: Record<MediaType, string> = {
    [MediaType.image]: 'images',
    [MediaType.audio]: 'audio'
}

@Injectable()
export class AbstractMediaService {
    constructor(
        @Inject("MEDIA_REST_CLIENT") private mediaClient: RestClientService,
        private configService: ConfigService,
        private triplestoreService: TriplestoreService,
        private personsService: PersonsService,
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

        return _request(basePath + '/api/fileUpload', {
            "auth": { user, pass },
            "qs": {
                "mediaClass": typeMediaClassMap[type]
            }
        });
    }

    async uploadMetadata<T extends MediaType>(type: T, tempId: string, media: Media<T>, personToken: string): Promise<Media|MetaResponse[]> {
        let person = await this.personsService.getByToken(personToken);
        if (personToken === this.configService.get("IMPORTER_TOKEN")) {
            person = {...person, id: media.uploadedBy || ''};
        }

        if (!media.intellectualRights) {
            throw new HttpException("Intellectual rights is required", 422);
        }

        const metadata = this.newMetadata(media, person, tempId);
        const data: MetaResponse[] = await this.mediaClient.post<any>('api/' +  typePathMap[type], metadata);

        if (data?.[0]?.id) {
            return this.findOne(type, data[0].id);
        } else {
            return data;
        }
    }

    private newMetadata(media: Media, person: Person, tempId: string): { meta: PartialMeta, tempFileId: string }[] {
        const meta = this.mediaToMeta(media, person);
        return [{
            meta: meta,
            tempFileId: tempId
        }];
    }

    private mediaToMeta(media: Media, person: Partial<Person> = {}, current: Partial<Meta> = {}): PartialMeta {
        return {
            capturers: media.capturerVerbatim || [],
            rightsOwner: media.intellectualOwner || '',
            license: media.intellectualRights || undefined,
            identifications: {
                verbatim: media.taxonVerbatim || current.identifications?.verbatim || undefined,
                taxonIds: current.identifications?.taxonIds || undefined
            },
            caption: media.caption || undefined,
            taxonDescriptionCaption: undefined,
            captureDateTime: this.timeToApiTime(media.captureDateTime) || undefined,
            tags: media.keyword || [],
            documentId: current.documentId || undefined,
            uploadedBy: current.uploadedBy || person.id || undefined,
            sourceSystem: current.sourceSystem || undefined,
            uploadedDateTime: current.uploadedDateTime || undefined,
            sortOrder: media.sortOrder || current.sortOrder || undefined,
            secret: (media.publicityRestrictions && media.publicityRestrictions !== 'MZ.publicityRestrictionsPublic') || false
        };
    }

    private timeToApiTime(date?: string|Date): string|undefined {
        if (!date) {
            return;
        }
        if (date instanceof Date) {
            date = date.toISOString();
        }
        let time = date.substring(0, 19);
        let timeMoment = moment(time);
        if (timeMoment.isValid()) {
            return timeMoment.utc(false).format('X');
        }
        return undefined;
    }
}
