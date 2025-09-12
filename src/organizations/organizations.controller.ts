import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { GetAllOrganizationsDto } from "./organizations.dto";

@ApiTags("Organization")
@LajiApiController("organizations")
export class OrganizationsController {
	constructor(
		private organizationsService: OrganizationsService
	) {}

	/** Get all organizations */
	@Get()
	@UseInterceptors(SelectedFields, Translator, Paginator)
	@SwaggerRemoteRef({ source: "store", ref: "/organization" })
	async getAll(@Query() _: GetAllOrganizationsDto) {
		return this.organizationsService.getAll();
	}

	/** Find an organization by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/organization" })
	async get(@Param("id") id: string) {
		return this.organizationsService.get(id);
	}
}
