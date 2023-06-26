import { Global, Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { LangService } from "./lang.service";

@Global()
@Module({
	imports: [MetadataModule],
	providers: [LangService],
	exports: [LangService]
})
export class LangModule {}
