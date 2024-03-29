import { Module } from "@nestjs/common";
import { PersonTokenModule } from "src/person-token/person-token.module";
import { ProfileModule } from "src/profile/profile.module";
import { TriplestoreModule } from "src/triplestore/triplestore.module";
import { IctAdminGuard } from "./ict-admin/ict-admin.guard";
import { PersonsController } from "./persons.controller";
import { PersonsService } from "./persons.service";

@Module({
	imports: [PersonTokenModule, ProfileModule, TriplestoreModule],
	controllers: [PersonsController],
	providers: [PersonsService,  IctAdminGuard],
	exports: [IctAdminGuard, PersonsService]
})
export class PersonsModule {}
