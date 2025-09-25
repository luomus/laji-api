import { IntersectionType, OmitType } from "@nestjs/swagger";
import { Unit } from "@luomus/laji-schema/classes/Unit";
import { CommonAutocompleteDto, HasLimitDto } from "src/autocomplete/autocomplete.dto";

export class GetTripReportUnitShorthandDto extends IntersectionType(CommonAutocompleteDto, HasLimitDto) {
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

export class TripReportUnitListResultDto {
	results: Unit[]; // TODO not working
	count: number;
	nonMatchingCount: number;
}
