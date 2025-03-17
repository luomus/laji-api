import { Module } from "@nestjs/common";
import { JsonLdController } from "./json-ld.controller";
import { JsonLdService } from "./json-ld.service";
import { SwaggerModule } from "src/swagger/swagger.module";

@Module({
	imports: [SwaggerModule],
	controllers: [JsonLdController],
	providers: [JsonLdService],
	exports: [JsonLdService],
})
export class JsonLdModule {}
