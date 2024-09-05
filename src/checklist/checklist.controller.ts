import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ChecklistService } from "./checklist.service";
import { createQueryParamsInterceptor } from "src/interceptors/query-params/query-params.interceptor";
import { GetChecklistDto, GetChecklistPageDto } from "./checklist.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("Checklist")
@LajiApiController("checklists")
export class ChecklistController {

	constructor(private checklistService: ChecklistService) {}

	/** Get a checklist by id */
	@Get(":id")
	@UseInterceptors(createQueryParamsInterceptor(GetChecklistDto))
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	get(@Param("id") id: string, @Query() _: GetChecklistDto) {
		return this.checklistService.get(id);
	}

	/** Get a page of checklists */
	@Get()
	@UseInterceptors(createQueryParamsInterceptor(GetChecklistPageDto))
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	getPage(@Query() { idIn }: GetChecklistPageDto) {
		return this.checklistService.find(idIn);
	}
}
