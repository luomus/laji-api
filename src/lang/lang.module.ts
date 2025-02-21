import { Global, Module } from "@nestjs/common";
import { LangService } from "./lang.service";

@Global()
@Module({
	providers: [LangService],
	exports: [LangService]
})
export class LangModule {}
