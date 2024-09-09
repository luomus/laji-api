import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { TriplestoreModule } from "src/triplestore/triplestore.module";

@Module({
	controllers: [OrganizationsController],
	providers: [OrganizationsService],
	imports: [TriplestoreModule]
})
export class OrganizationsModule {}
