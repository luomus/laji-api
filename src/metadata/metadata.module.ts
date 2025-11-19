import { Module } from "@nestjs/common";
import { MetadataService } from "./metadata.service";
import { TriplestoreReadonlyModule } from "src/triplestore/triplestore-readonly.module";
import { MetadataController } from "./metadata.controller";

@Module({
	imports: [TriplestoreReadonlyModule],
	providers: [MetadataService],
	exports: [MetadataService],
	controllers: [MetadataController]
})
export class MetadataModule {}
