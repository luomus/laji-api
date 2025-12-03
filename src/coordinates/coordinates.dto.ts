import { Type } from "class-transformer";
import { MultiLangDto } from "src/common.dto";
import { LocalJsonLdContext } from "src/decorators/local-json-ld-context.decorator";

export class AddressComponent {
	@Type(() => MultiLangDto) long_name: MultiLangDto;
	@Type(() => MultiLangDto) short_name: MultiLangDto;
	types: string[];
}

@LocalJsonLdContext("coordinates-location")
export class Location {
	@Type(() => AddressComponent) address_components: AddressComponent[];
	types: string[];
	formatted_address?: string;
	place_id: string;
}
