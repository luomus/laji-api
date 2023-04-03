import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { TriplestoreClientModule } from "./client/triplestore-client.module";
import { TriplestoreService } from "./triplestore.service";

@Module({
	imports: [TriplestoreClientModule, MetadataModule],
	providers: [TriplestoreService],
	exports: [TriplestoreService]
})
export class TriplestoreModule {}
