import { Module } from "@nestjs/common";
import { SourcesController } from "./sources.controller";
import { SourcesService } from "./sources.service";
import { TriplestoreModule } from "src/triplestore/triplestore.module";

@Module({
	imports: [TriplestoreModule],
	controllers: [SourcesController],
	providers: [SourcesService]
})
export class SourcesModule {}
