import { Get, Param } from "@nestjs/common";
import { BypassAccessTokenAuth } from "src/access-token/bypass-access-token-auth.decorator";
import { JsonLdService } from "./json-ld.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("JSON-LD context")
@LajiApiController("context")
export class JsonLdController {
	constructor(private contextService: JsonLdService) {}

	/** JSON-LD context */
	@Get(":context")
	@BypassAccessTokenAuth()
	async getContext(@Param("context") context: string) {
		return this.contextService.getEmbeddedContextForLocalContext(context);
	}
}
