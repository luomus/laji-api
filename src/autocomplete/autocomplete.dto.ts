import { Unit } from "@luomus/laji-schema/classes/Unit";
import { IntersectionType, OmitType } from "@nestjs/swagger";
import { PaginatedDto } from "src/pagination.utils";
import { IsOptionalBoolean } from "src/serialization/serialization.utils";

export class CommonAutocompleteDto extends IntersectionType(PaginatedDto) {
	/** Search term */
	query: string = "";
}

export class GetFriendsDto extends IntersectionType(CommonAutocompleteDto) {}

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

export class GetTripReportUnitListDto { }

export class GetTripReportUnitShorthandDto extends IntersectionType(CommonAutocompleteDto) {}

export class TripReportUnitListResultDto {
	results: Unit[]; // TODO not working
	count: number;
	nonMatchingCount: number;
}

export class TripReportUnitShorthandResponseDto {
	key: string;
	value: string;
	isNonMatching?: boolean;
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

