import { MultiLang } from '../common.dto';
import { Image, Audio } from '@luomus/laji-schema';

export enum MediaType {
    image = 'MM.image',
    audio = 'MM.audio'
}

export type Media<T extends MediaType = any> = T extends MediaType.image ? Image : Audio;

export class Meta {
    license: Media['intellectualRights'];
    rightsOwner: string;
    secret?: boolean;
    capturers?: string[];
    captureDateTime?: string;
    uploadedBy?: string;
    originalFilename?: string;
    documentId?: string;
    tags?: string[];
    identifications?: {
        taxonIds: string[];
        verbatim: string[];
    };
    primaryForTaxon?: string[];
    caption?: string;
    taxonDescriptionCaption?: MultiLang;
    sex?: string[];
    lifeStage?: string[];
    plantLifeStage?: string[];
    type?: string[];
    sortOrder?: number;
    uploadedDateTime?: string;
    sourceSystem?: string;
}

export interface PartialMeta extends Partial<Omit<Meta, 'identifications'>> {
    identifications?: {
        taxonIds?: string[];
        verbatim?: string[];
    }
}

export class FileUploadResponse {
    name: string;
    fileName: string;
    id: string;
    expires: number;
}

export class MetaUploadData {
    tempFileId: string;
    meta: PartialMeta;
}

export class MetaUploadResponse {
    id: string;
    secretKey?: string;
    urls: Urls;
    meta: Meta;
}

export class Urls {
    original?: string;
    full: string;
    large?: string;
    square?: string;
    thumbnail: string;
    pdf?: string;
    mp3?: string;
    wav?: string;
    video?: string;
    lowDetailModel?: string;
    highDetailModel?: string;
}
