import { Module } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { TriplestoreModule } from "src/triplestore/triplestore.module";
import { LangModule } from "src/lang/lang.module";

@Module({
	imports: [TriplestoreModule, LangModule],
	controllers: [CollectionsController],
	providers: [CollectionsService],
	exports: [CollectionsService]
})
export class CollectionsModule {}
