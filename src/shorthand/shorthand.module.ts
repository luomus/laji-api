import { Module } from "@nestjs/common";
import { ShorthandController } from "./shorthand.controller";
import { ShorthandService } from "./shorthand.service";
import { TripReportUnitListShorthandService } from "./trip-report-unit-list.shorthand.service";
import { LineTransectUnitShorthandService } from "./line-transect-unit.shorthand.service";
import { TripReportUnitShorthandService } from "./trip-report-unit.shorthand.service";
import { WaterBirdPairCountUnitShorthandService } from "./water-bird-pair-count-unit.shorthand.service";
import { TaxaModule } from "src/taxa/taxa.module";

@Module({
	imports: [TaxaModule],
	controllers: [ShorthandController],
	providers: [
		ShorthandService,
		TripReportUnitListShorthandService,
		TripReportUnitShorthandService,
		LineTransectUnitShorthandService,
		WaterBirdPairCountUnitShorthandService
	]
})
export class ShorthandModule {}
