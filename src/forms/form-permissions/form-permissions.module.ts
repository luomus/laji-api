import { forwardRef, Module } from "@nestjs/common";
import { CollectionsModule } from "src/collections/collections.module";
import { MailModule } from "src/mail/mail.module";
import { PersonsModule } from "src/persons/persons.module";
import { FormsModule } from "../forms.module";
import { FormPermissionsService } from "./form-permissions.service";
import { StoreClientModule } from "src/store/store-client/store-client.module";

@Module({
	imports: [PersonsModule, StoreClientModule, forwardRef(() => FormsModule), CollectionsModule, MailModule],
	providers: [FormPermissionsService],
	exports: [FormPermissionsService]
})
export class FormPermissionsModule {}
