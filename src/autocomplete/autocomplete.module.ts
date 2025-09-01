import { Module } from "@nestjs/common";
import { AutocompleteController } from "./autocomplete.controller";
import { AutocompleteService } from "./autocomplete.service";
import { PersonsModule } from "src/persons/persons.module";
import { ProfileModule } from "src/profile/profile.module";
import { TaxaModule } from "src/taxa/taxa.module";
import { TripReportUnitListAutocompleteService } from "./trip-report-unit-list.autocomplete.service";
import { TripReportUnitShorthandAutocompleteService } from "./trip-report-unit-shorthand.autocomplete.service";

@Module({
	imports: [PersonsModule, ProfileModule, TaxaModule],
	controllers: [AutocompleteController],
	providers: [AutocompleteService, TripReportUnitListAutocompleteService, TripReportUnitShorthandAutocompleteService]
})
export class AutocompleteModule {}
