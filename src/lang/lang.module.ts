import { Global, Module } from "@nestjs/common";
import { LangService } from "./lang.service";
import { JsonLdModule } from "src/json-ld/json-ld.module";

@Global()
@Module({
	imports: [JsonLdModule],
	providers: [LangService],
	exports: [LangService]
})
export class LangModule {}
