import { MultiLang } from "../common.dto";
import { Image, Audio } from "@luomus/laji-schema";

export enum MediaType {
    image = "MM.image",
    audio = "MM.audio"
}

export type Media<T extends MediaType> = T extends MediaType.image ? Image : Audio;

type MediaIntellectualRights = Media<any>["intellectualRights"];

export class Meta {
	license: MediaIntellectualRights;
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

export interface PartialMeta extends Partial<Omit<Meta, "identifications">> {
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

export const mediaIntellectualRightsValues: MediaIntellectualRights[] = [
	"MZ.intellectualRightsCC-BY-SA-4.0",
	"MZ.intellectualRightsCC-BY-NC-4.0",
	"MZ.intellectualRightsCC-BY-NC-SA-4.0",
	"MZ.intellectualRightsCC-BY-4.0",
	"MZ.intellectualRightsCC0-4.0",
	"MZ.intellectualRightsODBL-1.0",
	"MZ.intellectualRightsPD",
	"MZ.intellectualRightsARR",
	"MZ.intellectualRightsCC-BY-2.0",
	"MZ.intellectualRightsCC-BY-SA-2.0",
	"MZ.intellectualRightsCC-BY-SA-2.0-DE",
	"MZ.intellectualRightsCC-BY-NC-2.0",
	"MZ.intellectualRightsCC-BY-NC-SA-2.0",
	"MZ.intellectualRightsCC-BY-NC-ND-2.0",
	"MZ.intellectualRightsCC-BY-SA-2.5",
	"MZ.intellectualRightsCC-BY-SA-2.5-SE",
	"MZ.intellectualRightsCC-BY-3.0",
	"MZ.intellectualRightsCC-BY-SA-3.0",
	"MZ.intellectualRightsCC-BY-NC-SA-3.0",
	"MZ.intellectualRightsCC-BY-ND-4.0",
	"MZ.intellectualRightsCC-BY-NC-ND-4.0"
];
