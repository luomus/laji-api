import { IsBoolean } from "class-validator";
import { ParseOptionalBoolean } from "src/serializing/serializing";
import { Private } from "src/serializing/private.decorator";
import { PagedDto, Lang, MultiLang, HasContext } from "../common.dto";
import { OmitType } from "@nestjs/swagger";

export class FindCollectionsDto extends PagedDto {
	lang?: Lang = Lang.en;
	@ParseOptionalBoolean()
	@IsBoolean()
	langFallback?: boolean = true;
}

export enum MetadataStatus {
	Hidden = "MY.metadataStatusHidden"
}

export class TriplestoreCollection extends HasContext {
	id: string;
	metadataStatus?: MetadataStatus;
	isPartOf?: string;
	abbreviation?: string;

	temporalCoverage?: MultiLang;
	taxonomicCoverage?: MultiLang;
	methods?: MultiLang;
	coverageBasis?: MultiLang;
	collectionName: MultiLang;
	description?: MultiLang;
	concealmentBasis?: MultiLang;
	onlineUrl?: MultiLang;
	longName?: MultiLang;
	dataQualityDescription?: MultiLang;
	dataUseTerm?: MultiLang;
	geographicCoverage?: MultiLang;
	collectionLocation?: MultiLang;
	dataLocation?: MultiLang;

	downloadRequestHandler?: string[];
	shareToFEO?: boolean;
	collectionType:
		| "MY.collectionTypeSpecimens"
		| "MY.collectionTypeLiving"
		| "MY.collectionTypeMonitoring"
		| "MY.collectionTypeObservations"
		| "MY.collectionTypePublicationdata"
		| "MY.collectionTypePublication"
		| "MY.collectionTypeMixed"
		| "MY.collectionTypeOther"
		| "MY.collectionTypeGardenArea"
		| "MY.collectionTypeIndoorGardenArea"
		| "MY.collectionTypeOutdoorGardenArea"
		| "MY.collectionTypeGardenSublocation";
	intellectualRights:
		| "MY.intellectualRightsCC-BY"
		| "MY.intellectualRightsCC0"
		| "MY.intellectualRightsPD"
		| "MY.intellectualRightsARR";

	inMustikka?: boolean;
	editor?: string;
	creator?: string;
}

// The listed props are omitted because we need to override their type (into "T", and some of them always string).
// "T" is used according to whether the response should have a certain lang used, or whether it is returned with
// the whole multi lang object values.
export class Collection<T extends string | MultiLang = MultiLang> extends OmitType(TriplestoreCollection, [
	"collectionName",
	"description",
	"concealmentBasis",
	"onlineUrl",
	"longName",
	"dataQualityDescription",
	"dataUseTerm"
]) {
	collectionName: T;
	description?: T;
	concealmentBasis?: T;
	onlineUrl?: T;
	longName: T;
	dataQualityDescription?: T;
	dataUseTerm?: T;

	hasChildren?: boolean;

	@Private() collectionLocation?: MultiLang;
	@Private() dataLocation?: MultiLang;
	@Private() inMustikka?: boolean;
	@Private() editor?: string;
	@Private() creator?: string;
}

type GbifContact = {
	firstName: string;
	lastName: string;
	email: string[];
}

export type GbifCollection = {
	key: string;
	title: string;
	description: string;
	license: string;
	contacts: GbifContact[];
}
export type GbifCollectionResult = {
	results: GbifCollection[]
}
