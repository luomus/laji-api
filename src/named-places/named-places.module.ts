import { Module } from "@nestjs/common";
import { NamedPlacesService } from "./named-places.service";
import { NamedPlacesController } from "./named-places.controller";
import { StoreModule } from "src/store/store.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";

@Module({
	providers: [NamedPlacesService],
	imports: [StoreModule, PersonsModule, FormsModule],
	controllers: [NamedPlacesController]
})
export class NamedPlacesModule {}
