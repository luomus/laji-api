import { MultiLangDto } from "src/common.dto";

export class MetadataClass {
	class: string;
	label: MultiLangDto;
	shortName: string;
}

export class Property {
	domain: string[];
	maxOccurs: string;
	minOccurs: string;
	required: boolean;
	property: string;
	multiLanguage: boolean;
	shortName: string;
	range: string;
	label: MultiLangDto;
	hasMany: boolean;
	sortOrder: number;
	isEmbeddable: boolean;
}

export class Alt {
	id: string;
	value: MultiLangDto;
}
