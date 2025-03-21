import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiTags } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { QueryWithLangDto } from "src/common.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("Organization")
@LajiApiController("organizations")
export class OrganizationsController {
	constructor(
		private organizationsService: OrganizationsService
	) {}

	/** Find an organization by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(QueryWithLangDto))
	@SwaggerRemoteRef({ source: "store", ref: "organization" })
	async get(@Param("id") id: string, @Query() _: QueryWithLangDto) {
		return this.organizationsService.get(id);
	}
}
