import { Get, Param } from "@nestjs/common";
import { BypassAccessTokenAuth } from "src/decorators/bypass-access-token-auth.decorator";
import { JsonLdService } from "./json-ld.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";

@ApiTags("JSON-LD context")
@LajiApiController("context")
export class JsonLdController {
	constructor(
		private contextService: JsonLdService,
		private config: ConfigService
	) {}

	/** JSON-LD context */
	@Get(":context")
	@BypassAccessTokenAuth()
	async getContext(@Param("context") context: string) {
		const selfHost = this.config.get<string>("SELF_HOST");
		return this.contextService.getEmbeddedContextForLocalContext(`${selfHost}/context/${context}`);
	}
}
