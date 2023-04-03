import { Module } from "@nestjs/common";
import { TriplestoreReadonlyClientModule } from "src/triplestore/readonly-client/triplestore-readonly-client.module";
import { MetadataService } from "./metadata.service";

@Module({
	imports: [TriplestoreReadonlyClientModule],
	providers: [MetadataService],
	exports: [MetadataService]
})
export class MetadataModule {}
