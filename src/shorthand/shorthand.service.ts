import { Injectable } from "@nestjs/common";
import { TripReportUnitListShorthandService } from "./trip-report-unit-list.shorthand.service";
import { TripReportUnitShorthandService } from "./trip-report-unit.shorthand.service";
import { LineTransectUnitShorthandService } from "./line-transect-unit.shorthand.service";
import { WaterBirdPairCountUnitShorthandService }
	from "./water-bird-pair-count-unit.shorthand.service";
import { GetWaterBirdPairCountUnitShorthandDto } from "./shorthand.dto";
import { TaxaSearchDto } from "src/taxa/taxa.dto";

@Injectable()
export class ShorthandService {
	constructor(
		private tripReportUnitListShorthandService: TripReportUnitListShorthandService,
		private tripReportUnitShorthandService: TripReportUnitShorthandService,
		private lineTransectUnitShorthandService: LineTransectUnitShorthandService,
		private waterBirdPairCountUnitShorthandService: WaterBirdPairCountUnitShorthandService
	) {}

	async getTripReportUnitList(query?: string) {
		return this.tripReportUnitListShorthandService.shorthand(query);
	}

	async getTripReportUnitShorthand({ query, ...params }: TaxaSearchDto) {
		return this.tripReportUnitShorthandService.shorthand(query, params);
	}

	async getLineTransectUnitShorthand(query: string) {
		return this.lineTransectUnitShorthandService.shorthand(query);
	}

	async getWaterBirdPairCountUnitShorthand({ query, ...options }: GetWaterBirdPairCountUnitShorthandDto) {
		return this.waterBirdPairCountUnitShorthandService.shorthand(query, options);
	}
}
