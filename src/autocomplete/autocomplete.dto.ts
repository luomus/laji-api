import { Unit } from "@luomus/laji-schema/classes/Unit";
import { IntersectionType, OmitType } from "@nestjs/swagger";
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

export class GetTripReportUnitShorthandDto extends IntersectionType(CommonAutocompleteDto, HasLimitDto) {
}

export class TripReportUnitListResultDto {
	results: Unit[]; // TODO not working
	count: number;
	nonMatchingCount: number;
}

export class TripReportUnitShorthandResponseDto {
	key: string;
	value: string;
	isNonMatching?: boolean;
	matchType?: string;
	unit: Unit;
	interpretedFrom: {
		taxon: string;
		count: string;
		maleIndividualCount: string;
		femaleIndividualCount: string;
	};
};

export class LineTransectUnitShorthandResponseDto extends
	OmitType(TripReportUnitShorthandResponseDto, ["isNonMatching"]) { }

export class GetWaterBirdPairCountUnitShorthandDto extends IntersectionType(CommonAutocompleteDto) {
	taxonID: string;
}
