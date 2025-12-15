import { Get, Param, UseInterceptors } from "@nestjs/common";
import { RedListEvaluationGroupsService } from "./red-list-evaluation-groups.service";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { Translator } from "src/interceptors/translator.interceptor";
import { SwaggerRemoteRef } from "src/swagger/swagger-remote.decorator";

@ApiTags("Red List Evaluation Groups")
@LajiApiController("red-list-evaluation-groups")
export class RedListEvaluationGroupsController {
	constructor(private redListEvaluationGroupsService: RedListEvaluationGroupsService) {}

	/** Get a red list evaluation group by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemoteRef({ source: "store", ref: "/iucnRedListTaxonGroup" })
	get(@Param("id") id: string) {
		return this.redListEvaluationGroupsService.get(id);
	}
}
