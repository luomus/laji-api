import { Module } from "@nestjs/common";
import { NamedPlacesService } from "./named-places.service";
import { NamedPlacesController } from "./named-places.controller";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "src/forms/forms.module";
import { FormPermissionsModule } from "src/forms/form-permissions/form-permissions.module";
import { PrepopulatedDocumentModule } from "./prepopulated-document/prepopulated-document.module";
import { DocumentsModule } from "src/documents/documents.module";
import { CollectionsModule } from "src/collections/collections.module";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	providers: [NamedPlacesService],
	imports: [StoreClientModule, PersonsModule, FormsModule, FormPermissionsModule, PrepopulatedDocumentModule,
		DocumentsModule, CollectionsModule],
	controllers: [NamedPlacesController]
})
export class NamedPlacesModule {}
