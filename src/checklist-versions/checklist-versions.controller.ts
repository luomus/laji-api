import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ChecklistVersionsService } from "./checklist-versions.service";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { GetChecklistVersionsDto, GetChecklistVersionsPageDto } from "./checklist-versions.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("ChecklistVersions")
@LajiApiController("checklist-versions")
export class ChecklistVersionsController {

	constructor(private checklistService: ChecklistVersionsService) {}

	/** Get a checklist by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(GetChecklistVersionsDto))
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	get(@Param("id") id: string, @Query() _: GetChecklistVersionsDto) {
		return this.checklistService.get(id);
	}

	/** Get a page of checklists */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetChecklistVersionsPageDto))
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	getPage(@Query() { idIn }: GetChecklistVersionsPageDto) {
		return this.checklistService.find(idIn);
	}
}
