import { Module } from "@nestjs/common";
import { JsonLdController } from "./json-ld.controller";
import { JsonLdService } from "./json-ld.service";
import { SwaggerModule } from "src/swagger/swagger.module";
import { MetadataModule } from "src/metadata/metadata.module";

@Module({
	imports: [SwaggerModule, MetadataModule],
	controllers: [JsonLdController],
	providers: [JsonLdService],
	exports: [JsonLdService],
})
export class JsonLdModule {}
