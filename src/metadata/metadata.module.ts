import { Module } from "@nestjs/common";
import { MetadataService } from "./metadata.service";
import {TriplestoreReadonlyModule} from "src/triplestore/triplestore-readonly.module";

@Module({
	imports: [TriplestoreReadonlyModule],
	providers: [MetadataService],
	exports: [MetadataService]
})
export class MetadataModule {}
