import { Get, Param, UseInterceptors } from "@nestjs/common";
import { RedListEvaluationGroupsService } from "./red-list-evaluation-groups.service";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Translator } from "src/interceptors/translator.interceptor";

@ApiTags("RedListEvaluationGroups")
@LajiApiController("red-list-evaluation-groups")
export class RedListEvaluationGroupsController {
	constructor(private redListEvaluationGroupsService: RedListEvaluationGroupsService) {}

	@UseInterceptors(Translator)
	@Get(":id")
	get(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.get(id);
	}
}
