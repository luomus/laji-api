import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { LangService } from "./lang.service";

@Module({
	imports: [MetadataModule],
	providers: [LangService],
	exports: [LangService]
})
export class LangModule {}
