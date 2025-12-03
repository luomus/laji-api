import { MultiLangDto } from "src/common.dto";
import { LocalJsonLdContext } from "src/decorators/local-json-ld-context.decorator";

@LocalJsonLdContext("metadata-class")
export class MetadataClass {
	class: string;
	label: MultiLangDto;
	shortName: string;
}

@LocalJsonLdContext("metadata-property")
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

@LocalJsonLdContext("metadata-alt")
export class Alt {
	id: string;
	value: MultiLangDto;
}
