import { Type } from "class-transformer";
import { MultiLangDto } from "src/common.dto";

export class AddressComponent {
	@Type(() => MultiLangDto) long_name: MultiLangDto;
	@Type(() => MultiLangDto) short_name: MultiLangDto;
	types: string[];
}

export class Location {
	@Type(() => AddressComponent) address_components: AddressComponent[];
	types: string[];
	formatted_address?: string;
	place_id: string;
}
