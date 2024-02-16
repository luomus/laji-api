import { Module } from "@nestjs/common";
import { NamedPlacesService } from "./named-places.service";
import { NamedPlacesController } from "./named-places.controller";
import { StoreModule } from "src/store/store.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { PrepopulatedDocumentModule } from "./prepopulated-document/prepopulated-document.module";
import { DocumentsModule } from "src/documents/documents.module";

@Module({
	providers: [NamedPlacesService],
	imports: [StoreModule, PersonsModule, FormsModule, FormPermissionsModule, PrepopulatedDocumentModule,
		DocumentsModule],
	controllers: [NamedPlacesController]
})
export class NamedPlacesModule {}
