import { forwardRef, Module } from "@nestjs/common";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "../forms.module";
import { FormParticipantsService } from "./form-participants.service";
import { FormPermissionsModule } from "../form-permissions/form-permissions.module";
import { DocumentsModule } from "src/documents/documents.module";
import { CollectionsModule } from "src/collections/collections.module";

@Module({
	imports: [
		PersonsModule,
		DocumentsModule,
		CollectionsModule,
		forwardRef(() => FormsModule),
		forwardRef(() => FormPermissionsModule)
	],
	providers: [FormParticipantsService],
	exports: [FormParticipantsService]
})
export class FormParticipantsModule {}
