import { Module } from "@nestjs/common";
import { InformalTaxonGroupsController } from "./informal-taxon-groups.controller";
import { InformalTaxonGroupsService } from "./informal-taxon-groups.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";

@Module({
	imports: [TriplestoreReadonlyModule],
	controllers: [InformalTaxonGroupsController],
	providers: [InformalTaxonGroupsService]
})
export class InformalTaxonGroupsModule {}
