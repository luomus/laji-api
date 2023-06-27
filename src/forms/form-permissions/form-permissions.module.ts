import { forwardRef, Module } from "@nestjs/common";
import { CollectionsModule } from "src/collections/collections.module";
import {MailModule} from "src/mail/mail.module";
import { PersonsModule } from "src/persons/persons.module";
import { StoreModule } from "src/store/store.module";
import { FormsModule } from "../forms.module";
import { FormPermissionsService } from "./form-permissions.service";

@Module({
	imports: [PersonsModule, StoreModule, forwardRef(() => FormsModule), CollectionsModule, MailModule],
	providers: [FormPermissionsService],
	exports: [FormPermissionsService]
})
export class FormPermissionsModule {}
