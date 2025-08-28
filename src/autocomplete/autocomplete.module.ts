import { Module } from "@nestjs/common";
import { AutocompleteController } from "./autocomplete.controller";
import { AutocompleteService } from "./autocomplete.service";
import { PersonsModule } from "src/persons/persons.module";
import { ProfileModule } from "src/profile/profile.module";
import { TaxaModule } from "src/taxa/taxa.module";

@Module({
	imports: [PersonsModule, ProfileModule, TaxaModule],
	controllers: [AutocompleteController],
	providers: [AutocompleteService]
})
export class AutocompleteModule {}
