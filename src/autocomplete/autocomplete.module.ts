import { Module } from "@nestjs/common";
import { AutocompleteController } from "./autocomplete.controller";
import { AutocompleteService } from "./autocomplete.service";
import { PersonsModule } from "src/persons/persons.module";
import { ProfileModule } from "src/profile/profile.module";

@Module({
	imports: [PersonsModule, ProfileModule],
	controllers: [AutocompleteController],
	providers: [AutocompleteService]
})
export class AutocompleteModule {}
