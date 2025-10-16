import { Type } from "class-transformer";
import { MultiLangDto } from "src/common.dto";

export class AddressComponent {
	@Type(() => MultiLangDto) long_name: MultiLangDto;
	@Type(() => MultiLangDto) short_name: MultiLangDto;
}

export class LocationResponse {
	@Type(() => AddressComponent) address_components: AddressComponent[];
}
