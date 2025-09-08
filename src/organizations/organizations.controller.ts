import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { Get, Param, UseInterceptors } from "@nestjs/common";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";

@ApiTags("Organization")
@LajiApiController("organizations")
export class OrganizationsController {
	constructor(
		private organizationsService: OrganizationsService
	) {}

	/** Find an organization by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/organization" })
	async get(@Param("id") id: string) {
		return this.organizationsService.get(id);
	}
}
