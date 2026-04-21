import { Get, Param, Query, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ChecklistService } from "./checklist.service";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";
import { Paginator } from "src/interceptors/paginator.interceptor";
import { Translator } from "src/interceptors/translator.interceptor";
import { QueryWithPagingAndIdInAndSelectedFields } from "src/common.dto";
import { idAlwaysPresent } from "src/collections/collections.controller";
import { pipe } from "rxjs";
import { JSONSchemaRef } from "src/json-schema.utils";
import { firstFromNonEmptyArr, asTuple } from "src/utils";
import { SelectedFields } from "src/interceptors/selected-fields.interceptor";

@ApiTags("Checklist")
@LajiApiController("checklists")
export class ChecklistController {

	constructor(private checklistService: ChecklistService) {}

	/** Get a checklist by id */
	@Get(":id")
	@UseInterceptors(Translator)
	@SwaggerRemote({
		source: "store",
		ref: "/checklist",
		customizeResponseSchema: (schema, document) => pipe(
			idAlwaysPresent,
			firstFromNonEmptyArr
		)(asTuple(schema as JSONSchemaRef, document)),
	})
	get(@Param("id") id: string) {
		return this.checklistService.get(id);
	}

	/** Get a page of checklists */
	@Get()
	@UseInterceptors(Translator, SelectedFields, Paginator)
	@SwaggerRemote({ source: "store", ref: "/checklist" })
	getPage(@Query() { idIn }: QueryWithPagingAndIdInAndSelectedFields) {
		return this.checklistService.find(idIn);
	}
}
