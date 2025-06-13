import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ChecklistService } from "./checklist.service";
import { GetChecklistDto, GetChecklistPageDto } from "./checklist.dto";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";

@ApiTags("Checklist")
@LajiApiController("checklists")
export class ChecklistController {

	constructor(private checklistService: ChecklistService) {}

	/** Get a checklist by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	get(@Param("id") id: string, @Query() _: GetChecklistDto) {
		return this.checklistService.get(id);
	}

	/** Get a page of checklists */
	@Get()
	@UseInterceptors(Paginator, Translator)
	@SwaggerRemoteRef({ source: "store", ref: "checklist" })
	getPage(@Query() { idIn }: GetChecklistPageDto) {
		return this.checklistService.find(idIn);
	}
}
