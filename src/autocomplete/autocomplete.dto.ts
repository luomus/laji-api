import { IntersectionType } from "@nestjs/swagger";
import { QueryWithPersonTokenDto } from "src/common.dto";
import { IsOptionalBoolean } from "src/serialization/serialization.utils";

export class CommonAutocompleteDto {
	/** Search term */
	query: string = "";
}

export class HasLimitDto {
	/** Limit the size of results */
	limit?: number = 10;
}

export class GetPersonsDto extends IntersectionType(CommonAutocompleteDto, HasLimitDto) {
}

export class GetFriendsDto extends IntersectionType(GetPersonsDto, QueryWithPersonTokenDto) {}

export class GetUnitDto extends IntersectionType(CommonAutocompleteDto) {
	/** Different forms have different short hands */
	formID?: string = "JX.519";
	/** Interpret the query as comma separated list instead of taxon name */
	@IsOptionalBoolean() list?: boolean = false;
}

export class GetPersonsResponseDto {
	key: string;
	value?: string;
	name?: string;
	group?: string;
};

export class TaxonAutocompleteResponseDto {
	key: string;
	value: string;
};
