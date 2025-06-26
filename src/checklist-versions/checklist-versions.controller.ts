import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ChecklistVersionsService } from "./checklist-versions.service";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { QueryWithPagingAndIdIn } from "src/common.dto";

@ApiTags("ChecklistVersions")
@LajiApiController("checklist-versions")
export class ChecklistVersionsController {

	constructor(private checklistService: ChecklistVersionsService) {}

	/** Get a checklist by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	get(@Param("id") id: string) {
		return this.checklistService.get(id);
	}

	/** Get a page of checklists */
	@Get()
	@UseInterceptors(Paginator, Translator)
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	getPage(@Query() { idIn }: QueryWithPagingAndIdIn) {
		return this.checklistService.find(idIn);
	}
}
