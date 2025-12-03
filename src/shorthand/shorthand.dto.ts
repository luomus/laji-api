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
	// TODO the imported unit is an interface, and thus nestjs/swagger can't pull the typing correct.
	// To fix this, the @luomus/laji-schema would need to be fixed so that the import would be a class.
	results: Unit[];
	count: number;
	nonMatchingCount: number;
}
